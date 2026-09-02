package main.java.cn.jongwong.ro;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PencilDocumentCommentListResponse {

    private List<PencilDocumentCommentThreadResponse> threads;
}
