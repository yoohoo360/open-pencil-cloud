CREATE TABLE pencil_documents
(
    id             CHAR(36) PRIMARY KEY NOT NULL,
    key            VARCHAR(255) UNIQUE  NOT NULL,
    name           VARCHAR(500)         NOT NULL,
    url            VARCHAR(500)         NOT NULL,
    description    TEXT,
    team_id        CHAR(36),
    project_id     CHAR(36),
    thumbnail_url  VARCHAR(255),
    version        VARCHAR(50),
    schema_version VARCHAR(50),
    is_deleted     INT DEFAULT 0,
    created_at     BIGINT               NOT NULL,
    updated_at     BIGINT               NOT NULL
);



CREATE INDEX idx_documents_key ON pencil_documents (key);
CREATE INDEX idx_documents_modified ON pencil_documents (updated_at DESC);
CREATE INDEX idx_documents_team ON pencil_documents (team_id);



-- ============================================================
-- pencil_change - 变更索引表 (无 is_latest)
-- ============================================================

-- ============================================================
-- pencil_change - 极简变更表
-- ============================================================

DROP TABLE IF EXISTS pencil_change CASCADE;

CREATE TABLE pencil_change
(
    -- 主键
    id            VARCHAR(36) PRIMARY KEY,

    -- 关联
    file_id       VARCHAR(36) NOT NULL,

    -- 资源引用 (节点ID/图片ID/样式ID/变量ID/文件ID)
    ref           VARCHAR(200),

    -- 变更类型 (资源码 + 操作码)
    change_type   INT         NOT NULL,

    -- 资源类型 (node/image/style/variable/file/component/text/layout/comment)
    resource_type VARCHAR(20) NOT NULL,

    -- 排序 (同文件内变更顺序)
    sort          INT         NOT NULL,

    -- 版本号 (最大值即为最新)
    version       BIGINT      NOT NULL,

    -- 创建时间
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 索引
-- ============================================================

-- 按文件 + 版本 (查询最新版本)
CREATE INDEX idx_pencil_change_file_version ON pencil_change (file_id, version DESC);

-- 按文件查询
CREATE INDEX idx_pencil_change_file ON pencil_change (file_id);

-- 按资源类型查询
CREATE INDEX idx_pencil_change_resource ON pencil_change (resource_type);

-- 按变更类型查询
CREATE INDEX idx_pencil_change_type ON pencil_change (change_type);

-- 按引用查询
CREATE INDEX idx_pencil_change_ref ON pencil_change (ref);

-- 按时间查询
CREATE INDEX idx_pencil_change_created_at ON pencil_change (created_at DESC);

-- ============================================================
-- 注释
-- ============================================================

COMMENT ON TABLE pencil_change IS '变更索引表 (极简版)';
COMMENT ON COLUMN pencil_change.id IS '主键 ID';
COMMENT ON COLUMN pencil_change.file_id IS '文件 ID';
COMMENT ON COLUMN pencil_change.ref IS '资源引用: node_id, image_id, style_id, variable_id';
COMMENT ON COLUMN pencil_change.change_type IS '变更类型: 1=创建, 2=更新, 3=删除';
COMMENT ON COLUMN pencil_change.resource_type IS '资源类型: node, image,blob,variable';
COMMENT ON COLUMN pencil_change.sort IS '排序 (同文件内变更顺序)';
COMMENT ON COLUMN pencil_change.version IS '版本号 (最大值即为最新版本)';
COMMENT ON COLUMN pencil_change.created_at IS '创建时间';


-- ============================================================
-- pencil_node_changes - 节点变更内容表 (极简版)
-- ============================================================

DROP TABLE IF EXISTS pencil_node_changes CASCADE;

CREATE TABLE pencil_node_changes
(
    -- 主键
    id         VARCHAR(36) PRIMARY KEY,

    -- 关联
    file_id    VARCHAR(36) NOT NULL,
    change_id  VARCHAR(36) NOT NULL, -- 关联 pencil_change.id

    -- 节点完整数据 (JSON)
    data       JSONB       NOT NULL,

    -- 创建时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 索引
-- ============================================================

-- 按变更 ID 查询
CREATE INDEX idx_pencil_node_change_id ON pencil_node_changes (change_id);

-- 按文件查询
CREATE INDEX idx_pencil_node_file ON pencil_node_changes (file_id);

-- 按时间查询
CREATE INDEX idx_pencil_node_created_at ON pencil_node_changes (created_at DESC);

-- ============================================================
-- 注释
-- ============================================================

COMMENT ON TABLE pencil_node_changes IS '节点变更内容表 (极简版)';
COMMENT ON COLUMN pencil_node_changes.id IS '主键 ID';
COMMENT ON COLUMN pencil_node_changes.file_id IS '文件 ID';
COMMENT ON COLUMN pencil_node_changes.change_id IS '关联变更索引 ID (pencil_change.id)';
COMMENT ON COLUMN pencil_node_changes.data IS '节点完整数据 JSON';
COMMENT ON COLUMN pencil_node_changes.created_at IS '创建时间';


-- export interface FigKiwiDecodeResult {
--   nodeChanges: NodeChange[]
--   blobs: Uint8Array[]
--   figKiwiVersion: number
--   /** Deflated kiwi schema bytes from the original file (for roundtrip fidelity). */
--   figSchemaDeflated: Uint8Array
-- }
