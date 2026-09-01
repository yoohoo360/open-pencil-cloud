package cn.jongwong.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Slf4j
@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException ex)
            throws IOException {

        String code;
        String message;

        if (ex instanceof CredentialsExpiredException) {
            code = "TOKEN_EXPIRED";
            message = "TOKEN_EXPIRED";
        } else if (ex instanceof BadCredentialsException) {
            code = "INVALID_TOKEN";
            message = "INVALID_TOKEN";
        } else {
            code = "UNAUTHORIZED";
            message = "UNAUTHORIZED";
        }


        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        objectMapper.writeValue(response.getWriter(), Map.of(
                "code", code,
                "message", message
        ));
    }
}