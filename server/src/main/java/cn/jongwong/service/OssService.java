package cn.jongwong.service;

import cn.jongwong.dto.FileInfo;
import cn.jongwong.dto.OssPresignResponse;

import java.io.InputStream;
import java.util.List;

public interface OssService {

    /**
     * 上传文件
     */
    String upload(String path, String fileName, byte[] data);

    /**
     * 上传文件（带 InputStream）
     */
    String upload(String path, String fileName, InputStream inputStream);

    /**
     * 下载文件
     */
    byte[] download(String path);

    /**
     * 下载文件（返回 InputStream）
     */
    InputStream downloadAsStream(String path);

    /**
     * 删除文件
     */
    boolean delete(String path);

    /**
     * 列出前缀下的对象路径（不含子目录占位）
     */
    List<String> list(String prefix);

    /**
     * 删除前缀下的全部对象
     */
    boolean deletePrefix(String prefix);

    /**
     * 获取文件信息
     */
    FileInfo getFileInfo(String path);


    /**
     * 创建目录
     */
    boolean createDirectory(String path);

    /**
     * 移动/重命名
     */
    boolean move(String fromPath, String toPath);

    /**
     * 复制
     */
    boolean copy(String fromPath, String toPath);

    /**
     * 文件是否存在
     */
    boolean exists(String path);

    /**
     * 获取存储根路径
     */
    String getRootPath();

    /**
     * 生成直传预签名 PUT
     */
    OssPresignResponse presignUpload(String path, String fileName, String contentType);

    /**
     * 生成直读预签名 GET
     */
    OssPresignResponse presignDownload(String path);
}