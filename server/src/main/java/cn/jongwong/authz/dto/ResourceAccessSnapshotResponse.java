package cn.jongwong.authz.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceAccessSnapshotResponse {
    private String resourceType;
    private String resourceId;
    private String resourceKey;
    private String ownerId;
    private String organizationId;
    private Boolean personal;
    private Boolean allowCopy;
    private String myRole;
    private Set<String> capabilities;
    private List<ResourceGrantResponse> grants;
}
