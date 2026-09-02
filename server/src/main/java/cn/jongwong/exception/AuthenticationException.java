package main.java.cn.jongwong.exception;

import org.springframework.http.HttpStatus;

/**
 * Exception thrown when authentication fails.
 */
public class AuthenticationException extends ApiException {

    public AuthenticationException(String message) {
        super(HttpStatus.UNAUTHORIZED, message);
    }

    public AuthenticationException(String message, Throwable cause) {
        super(HttpStatus.UNAUTHORIZED, message, cause);
    }
}
