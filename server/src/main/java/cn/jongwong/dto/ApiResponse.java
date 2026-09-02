package main.java.cn.jongwong.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;
    private LocalDateTime timestamp;
    private long total;

    // ==================== 成功响应 ====================

    /**
     * 成功 - 返回数据 (200 OK)
     */
    public static <T> ApiResponse<T> ok(T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(data);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    /**
     * 成功 - 返回消息 + 数据 (200 OK)
     */
    public static <T> ApiResponse<T> ok(String message, T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setMessage(message);
        response.setData(data);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    /**
     * 成功 - 返回消息 (200 OK)
     */
    public static <T> ApiResponse<T> ok(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setMessage(message);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    public static <T> ApiResponse<Void> ok() {
        ApiResponse<Void> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }


    /**
     * 成功 - 返回数据 + 总数 (用于分页)
     */
    public static <T> ApiResponse<T> ok(T data, long total) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setData(data);
        response.setTotal(total);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    /**
     * 成功 - 返回消息 + 数据 + 总数 (用于分页)
     */
    public static <T> ApiResponse<T> ok(String message, T data, long total) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(true);
        response.setMessage(message);
        response.setData(data);
        response.setTotal(total);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    // ==================== 错误响应 ====================

    /**
     * 错误 - 返回错误消息 (400 Bad Request)
     */
    public static <T> ApiResponse<T> fail(String message) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(false);
        response.setMessage(message);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }

    /**
     * 错误 - 返回错误消息 + 数据
     */
    public static <T> ApiResponse<T> fail(String message, T data) {
        ApiResponse<T> response = new ApiResponse<>();
        response.setSuccess(false);
        response.setMessage(message);
        response.setData(data);
        response.setTimestamp(LocalDateTime.now());
        return response;
    }
}