package cn.jongwong.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "pencil_skill_group_teams")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilSkillGroupTeam {

    @Id
    @Column(length = 36)
    private String id;

    @Column(name = "group_id", length = 36, nullable = false)
    private String groupId;

    @Column(name = "team_id", length = 36, nullable = false)
    private String teamId;

    @Column(name = "created_by", length = 36)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private Long createdAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null) this.id = UUID.randomUUID().toString();
        if (this.groupId != null) this.groupId = this.groupId.trim();
        if (this.teamId != null) this.teamId = this.teamId.trim();
        if (this.createdBy != null) this.createdBy = this.createdBy.trim();
        if (this.createdAt == null) this.createdAt = System.currentTimeMillis();
    }
}
