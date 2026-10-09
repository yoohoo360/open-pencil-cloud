package cn.jongwong.service;

import cn.jongwong.entity.PencilSkill;
import cn.jongwong.entity.PencilSkillEntry;
import cn.jongwong.entity.PencilSkillGroup;
import cn.jongwong.exception.ApiException;
import cn.jongwong.repository.PencilSkillEntryRepository;
import cn.jongwong.repository.PencilSkillRepository;
import cn.jongwong.ro.SkillEntryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
public class PencilSkillPackageService {

    private final PencilSkillEntryRepository entryRepository;
    private final PencilSkillRepository skillRepository;
    private final PencilSkillService skillService;

    @Transactional
    public void seedPackage(PencilSkill skill, String skillMdContent) {
        String content = StringUtils.hasText(skillMdContent) ? skillMdContent : defaultSkillMd(skill);
        PencilSkillEntry skillMd = entryRepository.save(PencilSkillEntry.builder()
                .skillId(skill.getId())
                .parentId(null)
                .kind(PencilSkillEntry.KIND_FILE)
                .name(PencilSkillEntry.SKILL_MD)
                .path(PencilSkillEntry.SKILL_MD)
                .content(content)
                .sortOrder(0)
                .isDeleted(0)
                .build());
        entryRepository.save(PencilSkillEntry.builder()
                .skillId(skill.getId())
                .parentId(null)
                .kind(PencilSkillEntry.KIND_DIRECTORY)
                .name("references")
                .path("references")
                .content(null)
                .sortOrder(10)
                .isDeleted(0)
                .build());
        // Keep denormalized skill.content in sync with SKILL.md
        skill.setContent(skillMd.getContent());
        skillRepository.save(skill);
    }

    @Transactional
    public List<SkillEntryResponse> tree(String userId, String skillId) {
        PencilSkill skill = requireReadableSkill(userId, skillId);
        List<PencilSkillEntry> entries = entryRepository
                .findBySkillIdAndIsDeletedOrderByKindDescPathAsc(skill.getId(), 0);
        if (entries.isEmpty()) {
            // Lazy repair for skills created before packages.
            seedPackage(skill, skill.getContent());
            entries = entryRepository.findBySkillIdAndIsDeletedOrderByKindDescPathAsc(skill.getId(), 0);
        }
        return buildTree(entries);
    }

    @Transactional
    public void writeSkillMd(String userId, String skillId, String content) {
        requireWritableSkill(userId, skillId);
        PencilSkillEntry skillMd = entryRepository
                .findBySkillIdAndPathAndIsDeleted(skillId, PencilSkillEntry.SKILL_MD, 0)
                .orElseGet(() -> {
                    PencilSkill skill = skillRepository.findByIdAndIsDeleted(skillId, 0)
                            .orElseThrow(() -> ApiException.notFound("Skill not found"));
                    seedPackage(skill, content);
                    return entryRepository
                            .findBySkillIdAndPathAndIsDeleted(skillId, PencilSkillEntry.SKILL_MD, 0)
                            .orElseThrow(() -> ApiException.notFound("SKILL.md not found"));
                });
        skillMd.setContent(content == null ? "" : content);
        entryRepository.save(skillMd);
        syncSkillMd(skillId, skillMd.getContent());
    }

    @Transactional
    public SkillEntryResponse createEntry(
            String userId,
            String skillId,
            String kind,
            String name,
            String parentId,
            String content
    ) {
        PencilSkill skill = requireWritableSkill(userId, skillId);
        String normalizedKind = normalizeKind(kind);
        String basename = sanitizeName(name, normalizedKind);
        PencilSkillEntry parent = null;
        String parentPath = "";
        if (StringUtils.hasText(parentId)) {
            parent = requireEntry(parentId);
            if (!skill.getId().equals(parent.getSkillId())) {
                throw ApiException.badRequest("Parent does not belong to this skill");
            }
            if (!parent.isDirectory()) {
                throw ApiException.badRequest("Parent must be a directory");
            }
            parentPath = parent.getPath();
        }
        String path = parentPath.isEmpty() ? basename : parentPath + "/" + basename;
        entryRepository.findBySkillIdAndPathAndIsDeleted(skill.getId(), path, 0).ifPresent(existing -> {
            throw ApiException.badRequest("Path already exists: " + path);
        });
        PencilSkillEntry entry = entryRepository.save(PencilSkillEntry.builder()
                .skillId(skill.getId())
                .parentId(parent == null ? null : parent.getId())
                .kind(normalizedKind)
                .name(basename)
                .path(path)
                .content(PencilSkillEntry.KIND_FILE.equals(normalizedKind)
                        ? (content == null ? "" : content)
                        : null)
                .sortOrder(PencilSkillEntry.KIND_DIRECTORY.equals(normalizedKind) ? 10 : 20)
                .isDeleted(0)
                .build());
        return toResponse(entry, List.of());
    }

    @Transactional
    public SkillEntryResponse updateEntry(String userId, String entryId, String name, String content) {
        PencilSkillEntry entry = requireEntry(entryId);
        requireWritableSkill(userId, entry.getSkillId());
        boolean renamed = false;
        if (StringUtils.hasText(name) && !name.trim().equals(entry.getName())) {
            if (PencilSkillEntry.SKILL_MD.equals(entry.getPath()) && !PencilSkillEntry.SKILL_MD.equals(name.trim())) {
                throw ApiException.badRequest("SKILL.md cannot be renamed");
            }
            String newName = sanitizeName(name, entry.getKind());
            String parentPath = entry.getPath().contains("/")
                    ? entry.getPath().substring(0, entry.getPath().lastIndexOf('/'))
                    : "";
            String newPath = parentPath.isEmpty() ? newName : parentPath + "/" + newName;
            entryRepository.findBySkillIdAndPathAndIsDeleted(entry.getSkillId(), newPath, 0)
                    .ifPresent(existing -> {
                        if (!existing.getId().equals(entry.getId())) {
                            throw ApiException.badRequest("Path already exists: " + newPath);
                        }
                    });
            String oldPath = entry.getPath();
            entry.setName(newName);
            entry.setPath(newPath);
            renamed = true;
            if (entry.isDirectory()) {
                renameDescendants(entry.getSkillId(), oldPath, newPath);
            }
        }
        if (entry.isFile() && content != null) {
            entry.setContent(content);
            if (PencilSkillEntry.SKILL_MD.equals(entry.getPath())) {
                syncSkillMd(entry.getSkillId(), content);
            }
        }
        entryRepository.save(entry);
        if (renamed && PencilSkillEntry.SKILL_MD.equals(entry.getPath())) {
            syncSkillMd(entry.getSkillId(), entry.getContent());
        }
        return toResponse(entry, List.of());
    }

    @Transactional
    public void deleteEntry(String userId, String entryId) {
        PencilSkillEntry entry = requireEntry(entryId);
        requireWritableSkill(userId, entry.getSkillId());
        if (PencilSkillEntry.SKILL_MD.equals(entry.getPath())) {
            throw ApiException.badRequest("SKILL.md cannot be deleted");
        }
        softDeleteRecursive(entry);
        entryRepository.flush();
    }

    /** Flatten package text for AI codegen: SKILL.md first, then other markdown files. */
    @Transactional(readOnly = true)
    public String packagePrompt(String userId, String skillId) {
        tree(userId, skillId);
        List<PencilSkillEntry> files = entryRepository
                .findBySkillIdAndIsDeletedOrderByKindDescPathAsc(skillId, 0)
                .stream()
                .filter(PencilSkillEntry::isFile)
                .sorted(Comparator.comparing((PencilSkillEntry e) ->
                        PencilSkillEntry.SKILL_MD.equals(e.getPath()) ? "" : e.getPath()))
                .toList();
        StringBuilder sb = new StringBuilder();
        for (PencilSkillEntry file : files) {
            if (sb.length() > 0) sb.append("\n\n");
            sb.append("### ").append(file.getPath()).append("\n");
            sb.append(file.getContent() == null ? "" : file.getContent());
        }
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public byte[] exportZip(String userId, String skillId) {
        PencilSkill skill = requireReadableSkill(userId, skillId);
        List<PencilSkillEntry> entries = entryRepository
                .findBySkillIdAndIsDeletedOrderByKindDescPathAsc(skill.getId(), 0);
        if (entries.isEmpty()) {
            throw ApiException.badRequest("Skill package is empty");
        }
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(bos)) {
            String root = skill.getSkillKey() + "/";
            for (PencilSkillEntry entry : entries) {
                if (entry.isDirectory()) {
                    ZipEntry zipEntry = new ZipEntry(root + entry.getPath() + "/");
                    zos.putNextEntry(zipEntry);
                    zos.closeEntry();
                } else {
                    ZipEntry zipEntry = new ZipEntry(root + entry.getPath());
                    zos.putNextEntry(zipEntry);
                    byte[] bytes = (entry.getContent() == null ? "" : entry.getContent())
                            .getBytes(StandardCharsets.UTF_8);
                    zos.write(bytes);
                    zos.closeEntry();
                }
            }
            zos.finish();
            return bos.toByteArray();
        } catch (IOException ex) {
            throw ApiException.badRequest("Failed to build skill zip: " + ex.getMessage());
        }
    }

    @Transactional
    public void importZip(String userId, String skillId, InputStream zipStream) {
        PencilSkill skill = requireWritableSkill(userId, skillId);
        List<String> rawNames = new ArrayList<>();
        Map<String, String> rawFiles = new LinkedHashMap<>();
        try (ZipInputStream zis = new ZipInputStream(zipStream)) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String name = normalizeZipPath(entry.getName());
                if (name.startsWith("__MACOSX/") || name.endsWith("/.DS_Store") || name.equals(".DS_Store")) {
                    continue;
                }
                if (!StringUtils.hasText(name)) continue;
                rawNames.add(name);
                if (name.endsWith("/")) continue;
                if (name.contains("..")) throw ApiException.badRequest("Invalid path in zip");
                byte[] data = zis.readAllBytes();
                rawFiles.put(name, new String(data, StandardCharsets.UTF_8));
            }
        } catch (IOException ex) {
            throw ApiException.badRequest("Failed to read skill zip: " + ex.getMessage());
        }
        if (rawFiles.isEmpty()) throw ApiException.badRequest("Zip contains no files");

        // Only strip a wrapper folder when every entry shares that single top segment
        // (e.g. skill-key/SKILL.md). Do not strip nested dirs like references/.
        String rootPrefix = commonRootPrefix(rawNames);
        Map<String, String> files = new LinkedHashMap<>();
        for (Map.Entry<String, String> file : rawFiles.entrySet()) {
            String path = file.getKey();
            if (!rootPrefix.isEmpty() && path.startsWith(rootPrefix)) {
                path = path.substring(rootPrefix.length());
            }
            if (!StringUtils.hasText(path) || path.endsWith("/")) continue;
            if (path.contains("..")) throw ApiException.badRequest("Invalid path in zip");
            files.put(path, file.getValue());
        }

        if (files.isEmpty()) throw ApiException.badRequest("Zip contains no files");
        if (!files.containsKey(PencilSkillEntry.SKILL_MD)) {
            throw ApiException.badRequest("Zip must include SKILL.md");
        }
        clearPackage(skill.getId());
        Map<String, String> dirIds = new HashMap<>();
        // Create directories first
        for (String path : files.keySet()) {
            ensureDirectoryPath(skill.getId(), path.contains("/") ? path.substring(0, path.lastIndexOf('/')) : "", dirIds);
        }
        for (Map.Entry<String, String> file : files.entrySet()) {
            String path = file.getKey();
            String parentPath = path.contains("/") ? path.substring(0, path.lastIndexOf('/')) : "";
            String name = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
            String parentId = parentPath.isEmpty() ? null : dirIds.get(parentPath);
            entryRepository.save(PencilSkillEntry.builder()
                    .skillId(skill.getId())
                    .parentId(parentId)
                    .kind(PencilSkillEntry.KIND_FILE)
                    .name(name)
                    .path(path)
                    .content(file.getValue())
                    .sortOrder(PencilSkillEntry.SKILL_MD.equals(path) ? 0 : 20)
                    .isDeleted(0)
                    .build());
        }
        String skillMd = files.getOrDefault(PencilSkillEntry.SKILL_MD, "");
        syncSkillMd(skill.getId(), skillMd);
    }

    /** Replace target package with a deep copy of source package (no auth). */
    @Transactional
    public void copyPackage(String sourceSkillId, String targetSkillId) {
        List<PencilSkillEntry> source = entryRepository
                .findBySkillIdAndIsDeletedOrderByKindDescPathAsc(sourceSkillId, 0);
        clearPackage(targetSkillId);
        Map<String, String> idMap = new HashMap<>();
        // First pass: create all entries without parents, then fix — better: sort by path depth
        List<PencilSkillEntry> ordered = new ArrayList<>(source);
        ordered.sort(Comparator.comparingInt(e -> e.getPath().split("/").length));
        for (PencilSkillEntry src : ordered) {
            String newParentId = null;
            if (StringUtils.hasText(src.getParentId())) {
                newParentId = idMap.get(src.getParentId());
            }
            PencilSkillEntry copy = entryRepository.save(PencilSkillEntry.builder()
                    .skillId(targetSkillId)
                    .parentId(newParentId)
                    .kind(src.getKind())
                    .name(src.getName())
                    .path(src.getPath())
                    .content(src.getContent())
                    .sortOrder(src.getSortOrder())
                    .isDeleted(0)
                    .build());
            idMap.put(src.getId(), copy.getId());
        }
        source.stream()
                .filter(e -> PencilSkillEntry.SKILL_MD.equals(e.getPath()))
                .findFirst()
                .ifPresent(e -> syncSkillMd(targetSkillId, e.getContent()));
    }

    /**
     * Replace semantics for zip import / package copy. Soft-delete every live entry (paths
     * renamed so the unique index frees), then flush before new inserts — otherwise
     * Hibernate batching can insert {@code SKILL.md} again before the deletes hit the DB.
     */
    private void clearPackage(String skillId) {
        List<PencilSkillEntry> entries = entryRepository
                .findBySkillIdAndIsDeletedOrderByKindDescPathAsc(skillId, 0);
        if (entries.isEmpty()) return;
        for (PencilSkillEntry entry : entries) {
            entry.softDelete();
            entry.setPath(entry.getPath() + "#deleted#" + entry.getId());
        }
        entryRepository.saveAll(entries);
        entryRepository.flush();
    }

    private void ensureDirectoryPath(String skillId, String dirPath, Map<String, String> dirIds) {
        if (!StringUtils.hasText(dirPath) || dirIds.containsKey(dirPath)) return;
        String parentPath = dirPath.contains("/") ? dirPath.substring(0, dirPath.lastIndexOf('/')) : "";
        ensureDirectoryPath(skillId, parentPath, dirIds);
        String name = dirPath.contains("/") ? dirPath.substring(dirPath.lastIndexOf('/') + 1) : dirPath;
        PencilSkillEntry dir = entryRepository.save(PencilSkillEntry.builder()
                .skillId(skillId)
                .parentId(parentPath.isEmpty() ? null : dirIds.get(parentPath))
                .kind(PencilSkillEntry.KIND_DIRECTORY)
                .name(name)
                .path(dirPath)
                .content(null)
                .sortOrder(10)
                .isDeleted(0)
                .build());
        dirIds.put(dirPath, dir.getId());
    }

    private static String normalizeZipPath(String name) {
        String path = name == null ? "" : name.replace('\\', '/');
        while (path.startsWith("./")) path = path.substring(2);
        return path;
    }

    /**
     * When every zip entry lives under one top-level folder (export layout
     * {@code skill-key/…}), return that prefix including the slash; otherwise empty.
     * Nested package folders such as {@code references/} must not be stripped.
     */
    static String commonRootPrefix(List<String> names) {
        String root = null;
        boolean sawFile = false;
        for (String raw : names) {
            String path = normalizeZipPath(raw);
            if (!StringUtils.hasText(path)) continue;
            boolean directory = path.endsWith("/");
            if (directory) path = path.substring(0, path.length() - 1);
            if (!StringUtils.hasText(path)) continue;
            int slash = path.indexOf('/');
            if (slash <= 0) {
                // Top-level file (SKILL.md) or empty-segment path → no wrapper folder.
                if (!directory) return "";
                continue;
            }
            String segment = path.substring(0, slash + 1);
            if (root == null) root = segment;
            else if (!root.equals(segment)) return "";
            if (!directory) sawFile = true;
        }
        return sawFile && root != null ? root : "";
    }

    private void softDeleteRecursive(PencilSkillEntry entry) {
        if (entry.isDirectory()) {
            for (PencilSkillEntry child : entryRepository
                    .findByParentIdAndIsDeletedOrderByKindDescNameAsc(entry.getId(), 0)) {
                softDeleteRecursive(child);
            }
        }
        entry.softDelete();
        // Avoid unique path collisions after soft-delete.
        entry.setPath(entry.getPath() + "#deleted#" + entry.getId());
        entryRepository.save(entry);
    }

    private void renameDescendants(String skillId, String oldPrefix, String newPrefix) {
        List<PencilSkillEntry> descendants = entryRepository
                .findBySkillIdAndPathStartingWithAndIsDeleted(skillId, oldPrefix + "/", 0);
        for (PencilSkillEntry child : descendants) {
            child.setPath(newPrefix + child.getPath().substring(oldPrefix.length()));
            entryRepository.save(child);
        }
    }

    private void syncSkillMd(String skillId, String content) {
        skillRepository.findByIdAndIsDeleted(skillId, 0).ifPresent(skill -> {
            String text = content == null ? "" : content;
            skill.setContent(text);
            Frontmatter meta = parseFrontmatter(text);
            if (StringUtils.hasText(meta.name)) skill.setName(meta.name.trim());
            // Description may be cleared intentionally in frontmatter.
            if (meta.hasDescription) {
                skill.setDescription(meta.description);
            }
            skillRepository.save(skill);
        });
    }

    private record Frontmatter(String name, String description, boolean hasDescription) {}

    private static Frontmatter parseFrontmatter(String markdown) {
        if (!StringUtils.hasText(markdown) || !markdown.startsWith("---")) {
            return new Frontmatter("", "", false);
        }
        int start = markdown.indexOf('\n');
        if (start < 0) return new Frontmatter("", "", false);
        int end = markdown.indexOf("\n---", start + 1);
        if (end < 0) return new Frontmatter("", "", false);
        String block = markdown.substring(start + 1, end);
        String name = readYamlValue(block, "name");
        boolean hasDescription = block.lines().anyMatch(line ->
                line.toLowerCase(Locale.ROOT).trim().startsWith("description:"));
        String description = readYamlValue(block, "description");
        return new Frontmatter(name, description, hasDescription);
    }

    /** Supports plain scalars and YAML literal/folded blocks (`|` / `>`). */
    private static String readYamlValue(String block, String key) {
        String[] lines = block.split("\n", -1);
        String prefix = key.toLowerCase(Locale.ROOT) + ":";
        for (int i = 0; i < lines.length; i++) {
            String raw = lines[i];
            String trimmed = raw.trim();
            if (!trimmed.toLowerCase(Locale.ROOT).startsWith(prefix)) continue;
            String rest = trimmed.substring(prefix.length()).trim();
            if (rest.equals("|") || rest.equals(">")
                    || rest.equals("|-") || rest.equals("|+")
                    || rest.equals(">-") || rest.equals(">+")
                    || rest.isEmpty()) {
                boolean folded = rest.startsWith(">");
                if (rest.isEmpty()) {
                    // `description:` followed by indented lines
                    if (i + 1 >= lines.length || !lines[i + 1].matches("^\\s+\\S.*")) {
                        return "";
                    }
                }
                return readBlockScalar(lines, i + 1, folded);
            }
            if ((rest.startsWith("\"") && rest.endsWith("\""))
                    || (rest.startsWith("'") && rest.endsWith("'"))) {
                return rest.substring(1, rest.length() - 1);
            }
            return rest;
        }
        return "";
    }

    private static String readBlockScalar(String[] lines, int start, boolean folded) {
        StringBuilder sb = new StringBuilder();
        Integer indent = null;
        for (int i = start; i < lines.length; i++) {
            String line = lines[i];
            if (line.isBlank() && indent == null) {
                if (sb.length() > 0) sb.append('\n');
                continue;
            }
            int leading = 0;
            while (leading < line.length() && Character.isWhitespace(line.charAt(leading))) {
                leading++;
            }
            if (indent == null) {
                if (leading == 0) break;
                indent = leading;
            } else if (!line.isBlank() && leading < indent) {
                break;
            }
            String content = indent != null && leading >= indent
                    ? line.substring(indent)
                    : line.stripLeading();
            if (sb.length() > 0) sb.append(folded ? ' ' : '\n');
            sb.append(folded ? content.stripTrailing() : content);
        }
        return sb.toString().stripTrailing();
    }

    private PencilSkill requireReadableSkill(String userId, String skillId) {
        PencilSkill skill = skillRepository.findByIdAndIsDeleted(skillId, 0)
                .orElseThrow(() -> ApiException.notFound("Skill not found"));
        if (skill.isTeamRemote()) {
            skillService.requireTeamMember(userId, skill.getTeamId());
            return skill;
        }
        PencilSkillGroup group = skillService.requireGroup(skill.getGroupId());
        skillService.requireCanReadGroup(userId, group);
        return skill;
    }

    private PencilSkill requireWritableSkill(String userId, String skillId) {
        PencilSkill skill = skillRepository.findByIdAndIsDeleted(skillId, 0)
                .orElseThrow(() -> ApiException.notFound("Skill not found"));
        if (skill.isTeamRemote()) {
            // Team remotes are updated via merge admission, not direct edit by default.
            throw ApiException.forbidden("Team remote skills are updated by merging a share request");
        }
        PencilSkillGroup group = skillService.requireGroup(skill.getGroupId());
        skillService.requireCanWriteGroup(userId, group);
        return skill;
    }

    private PencilSkillEntry requireEntry(String entryId) {
        return entryRepository.findByIdAndIsDeleted(entryId, 0)
                .orElseThrow(() -> ApiException.notFound("Skill entry not found"));
    }

    private List<SkillEntryResponse> buildTree(List<PencilSkillEntry> entries) {
        Map<String, SkillEntryResponse> nodes = new LinkedHashMap<>();
        for (PencilSkillEntry entry : entries) {
            nodes.put(entry.getId(), toResponse(entry, new ArrayList<>()));
        }
        List<SkillEntryResponse> roots = new ArrayList<>();
        for (PencilSkillEntry entry : entries) {
            SkillEntryResponse node = nodes.get(entry.getId());
            if (StringUtils.hasText(entry.getParentId()) && nodes.containsKey(entry.getParentId())) {
                nodes.get(entry.getParentId()).getChildren().add(node);
            } else {
                roots.add(node);
            }
        }
        sortTree(roots);
        return roots;
    }

    private void sortTree(List<SkillEntryResponse> nodes) {
        nodes.sort(Comparator
                .comparing((SkillEntryResponse n) -> !"directory".equals(n.getKind()))
                .thenComparing(SkillEntryResponse::getName, String.CASE_INSENSITIVE_ORDER));
        for (SkillEntryResponse node : nodes) {
            if (node.getChildren() != null && !node.getChildren().isEmpty()) {
                sortTree(node.getChildren());
            }
        }
    }

    private SkillEntryResponse toResponse(PencilSkillEntry entry, List<SkillEntryResponse> children) {
        return SkillEntryResponse.builder()
                .id(entry.getId())
                .skillId(entry.getSkillId())
                .parentId(entry.getParentId())
                .kind(entry.getKind())
                .name(entry.getName())
                .path(entry.getPath())
                .content(entry.isFile() ? entry.getContent() : null)
                .sortOrder(entry.getSortOrder())
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .children(children)
                .build();
    }

    private static String normalizeKind(String kind) {
        String value = kind == null ? "" : kind.trim().toLowerCase(Locale.ROOT);
        if (!PencilSkillEntry.KIND_FILE.equals(value) && !PencilSkillEntry.KIND_DIRECTORY.equals(value)) {
            throw ApiException.badRequest("kind must be file or directory");
        }
        return value;
    }

    private static String sanitizeName(String raw, String kind) {
        String name = raw == null ? "" : raw.trim();
        if (!StringUtils.hasText(name)) throw ApiException.badRequest("name is required");
        if (name.contains("/") || name.contains("\\") || name.contains("..")) {
            throw ApiException.badRequest("name cannot contain path separators");
        }
        if (name.length() > 200) throw ApiException.badRequest("name is too long");
        if (PencilSkillEntry.KIND_DIRECTORY.equals(kind)) {
            String key = name.toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9._-]+", "-")
                    .replaceAll("-+", "-")
                    .replaceAll("^-|-$", "");
            if (!StringUtils.hasText(key)) throw ApiException.badRequest("invalid directory name");
            return key;
        }
        return name;
    }

    private static String defaultSkillMd(PencilSkill skill) {
        String name = skill.getName() == null ? "" : skill.getName().trim();
        String description = skill.getDescription() == null ? "" : skill.getDescription().replace("\r\n", "\n");
        StringBuilder sb = new StringBuilder();
        sb.append("---\n");
        sb.append("name: ").append(name).append('\n');
        if (description.contains("\n") || description.length() > 80) {
            sb.append("description: |\n");
            for (String line : description.split("\n", -1)) {
                if (line.isEmpty()) sb.append('\n');
                else sb.append("  ").append(line).append('\n');
            }
        } else {
            sb.append("description: ").append(description).append('\n');
        }
        sb.append("---\n\n");
        sb.append("# ").append(name).append("\n\n");
        sb.append("## When to use\n");
        sb.append("Describe when this skill should guide codegen.\n\n");
        sb.append("## Instructions\n");
        sb.append("- Prefer clear, idiomatic output\n");
        sb.append("- Put longer docs under `references/`\n");
        return sb.toString();
    }
}
