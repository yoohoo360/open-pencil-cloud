package main.java.cn.jongwong.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OauthProvidersResponse {

    private boolean github;
    private boolean google;
}
