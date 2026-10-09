package cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillMergeRequestResponse {

    private String id;
    private String orgId;
    private String sourceSkillId;
    private String targetTeamId;
    private String targetSkillId;
    private String skillKey;
    private String title;
    private String message;
    private String status;
    private String createdBy;
    private String reviewedBy;
    private String reviewNote;
    private Long createdAt;
    private Long updatedAt;
    private Long mergedAt;
    private String sourceSkillName;
    private String targetTeamName;
}
