package main.java.cn.jongwong.domain.entity.id;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
@Embeddable
public class TeamMemberId implements Serializable {

    @Column(name = "team_id", nullable = false, length = 36)
    private String teamId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;
}
