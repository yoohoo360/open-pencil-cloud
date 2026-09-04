package cn.jongwong.service;

import cn.jongwong.dto.FileInfo;

import java.io.InputStream;

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
}