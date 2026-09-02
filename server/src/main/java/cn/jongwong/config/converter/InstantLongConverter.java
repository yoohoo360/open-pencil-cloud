package main.java.cn.jongwong.config.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.Instant;

/**
 * 将 Instant <-> Long(ms) 相互转换并自动应用到所有 Instant 字段。
 * DB 列需使用 BIGINT 存储毫秒时间戳。
 */
@Converter(autoApply = true)
public class InstantLongConverter implements AttributeConverter<Instant, Long> {

    @Override
    public Long convertToDatabaseColumn(Instant attribute) {
        return attribute == null ? null : attribute.toEpochMilli();
    }

    @Override
    public Instant convertToEntityAttribute(Long dbData) {
        return dbData == null ? null : Instant.ofEpochMilli(dbData);
    }
}