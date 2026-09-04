package cn.jongwong.common;

import org.springframework.beans.BeanUtils;
import org.springframework.util.CollectionUtils;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 通用对象转换工具类 (基于 Spring BeanUtils)
 */
public class ConvertUtils {

    /**
     * 单个对象转换
     */
    public static <T, R> R convert(T source, Class<R> targetClass) {
        if (source == null) {
            return null;
        }
        try {
            R target = targetClass.getDeclaredConstructor().newInstance();
            BeanUtils.copyProperties(source, target);
            return target;
        } catch (Exception e) {
            throw new RuntimeException("对象转换失败: " + e.getMessage(), e);
        }
    }

    /**
     * 单个对象转换 (忽略指定字段)
     */
    public static <T, R> R convert(T source, Class<R> targetClass, String... ignoreProperties) {
        if (source == null) {
            return null;
        }
        try {
            R target = targetClass.getDeclaredConstructor().newInstance();
            BeanUtils.copyProperties(source, target, ignoreProperties);
            return target;
        } catch (Exception e) {
            throw new RuntimeException("对象转换失败: " + e.getMessage(), e);
        }
    }

    /**
     * 列表转换
     */
    public static <T, R> List<R> convertList(List<T> sources, Class<R> targetClass) {
        if (CollectionUtils.isEmpty(sources)) {
            return Collections.emptyList();
        }
        return sources.stream()
                .map(source -> convert(source, targetClass))
                .collect(Collectors.toList());
    }

    /**
     * 列表转换 (忽略指定字段)
     */
    public static <T, R> List<R> convertList(List<T> sources, Class<R> targetClass, String... ignoreProperties) {
        if (CollectionUtils.isEmpty(sources)) {
            return Collections.emptyList();
        }
        return sources.stream()
                .map(source -> convert(source, targetClass, ignoreProperties))
                .collect(Collectors.toList());
    }

    /**
     * 更新已有对象 (源 → 目标)
     */
    public static <T> void copy(T source, T target, String... ignoreProperties) {
        if (source == null || target == null) {
            return;
        }
        BeanUtils.copyProperties(source, target, ignoreProperties);
    }

    /**
     * 获取 null 属性名数组 (用于更新时忽略 null)
     */
    public static String[] getNullPropertyNames(Object source) {
        if (source == null) {
            return new String[0];
        }
        try {
            java.beans.PropertyDescriptor[] pds =
                    java.beans.Introspector.getBeanInfo(source.getClass())
                            .getPropertyDescriptors();
            List<String> nullNames = new java.util.ArrayList<>();
            for (java.beans.PropertyDescriptor pd : pds) {
                java.lang.reflect.Method getter = pd.getReadMethod();
                if (getter != null) {
                    Object value = getter.invoke(source);
                    if (value == null) {
                        nullNames.add(pd.getName());
                    }
                }
            }
            return nullNames.toArray(new String[0]);
        } catch (Exception e) {
            return new String[0];
        }
    }

    /**
     * 更新已有对象 (自动忽略 null 值)
     */
    public static <T> void copyIgnoreNull(T source, T target) {
        if (source == null || target == null) {
            return;
        }
        String[] nullProperties = getNullPropertyNames(source);
        BeanUtils.copyProperties(source, target, nullProperties);
    }
}