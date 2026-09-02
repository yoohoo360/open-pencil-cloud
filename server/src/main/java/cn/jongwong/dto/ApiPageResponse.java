package main.java.cn.jongwong.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiPageResponse<T> {

    private boolean success;
    private String message;
    private Long total;
    private List<T> data;
    private LocalDateTime timestamp;
    private Integer currentPage;
    private Integer pageSize;
    private Integer totalPages;

    // ==================== 成功响应 ====================

    /**
     * 成功 - 返回分页数据
     */
    public static <T> ApiPageResponse<T> success(Page<T> page) {
        ApiPageResponse<T> response = new ApiPageResponse<>();
        response.setSuccess(true);
        response.setData(page.getContent());
        response.setTotal(page.getTotalElements());
        response.setCurrentPage(page.getNumber());
        response.setPageSize(page.getSize());
        response.setTotalPages(page.getTotalPages());
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    /**
     * 成功 - 返回分页数据 + 消息
     */
    public static <T> ApiPageResponse<T> ok(Page<T> page, String message) {
        ApiPageResponse<T> response = success(page);
        response.setMessage(message);
        return response;
    }

    /**
     * 成功 - 返回列表数据 + 总数
     */
    public static <T> ApiPageResponse<T> ok(List<T> data, Long total) {
        ApiPageResponse<T> response = new ApiPageResponse<>();
        response.setSuccess(true);
        response.setData(data);
        response.setTotal(total);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    /**
     * 成功 - 返回列表数据 + 总数 + 消息
     */
    public static <T> ApiPageResponse<T> ok(String message, List<T> data, Long total) {
        ApiPageResponse<T> response = ok(data, total);
        response.setMessage(message);
        return response;
    }

    // ==================== 错误响应 ====================

    /**
     * 错误 - 返回错误消息
     */
    public static <T> ApiPageResponse<T> fail(String message) {
        ApiPageResponse<T> response = new ApiPageResponse<>();
        response.setSuccess(false);
        response.setMessage(message);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    /**
     * 错误 - 返回错误消息 + 数据
     */
    public static <T> ApiPageResponse<T> fail(String message, List<T> data) {
        ApiPageResponse<T> response = new ApiPageResponse<>();
        response.setSuccess(false);
        response.setMessage(message);
        response.setData(data);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }
}