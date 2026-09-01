package cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilDocumentVersionListResponse {

    private Long currentUpdatedAt;
    private Long autosaveCount;
    private List<PencilDocumentVersionResponse> autosaves;
    private List<PencilDocumentVersionResponse> named;
    private Boolean namedHasMore;
}
