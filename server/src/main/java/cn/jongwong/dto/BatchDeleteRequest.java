package main.java.cn.jongwong.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BatchDeleteRequest {
    @NotEmpty
    private List<String> ids;
}
