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
public class EventAttendeeId implements Serializable {

    @Column(name = "event_id", nullable = false, length = 36)
    private String eventId;

    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;
}
