# 基础镜像使用 Maven + OpenJDK
FROM  registry.cn-hangzhou.aliyuncs.com/jongwong/maven:3.9.9-eclipse-temurin-21 AS build


# 更新 Maven 配置为阿里云镜像
RUN echo "<mirrors>" > /usr/share/maven/ref/settings-docker.xml && \
    echo "  <mirror>" >> /usr/share/maven/ref/settings-docker.xml && \
    echo "    <id>aliyunmaven</id>" >> /usr/share/maven/ref/settings-docker.xml && \
    echo "    <mirrorOf>central</mirrorOf>" >> /usr/share/maven/ref/settings-docker.xml && \
    echo "    <url>https://maven.aliyun.com/repository/public</url>" >> /usr/share/maven/ref/settings-docker.xml && \
    echo "    <blocked>false</blocked>" >> /usr/share/maven/ref/settings-docker.xml && \
    echo "  </mirror>" >> /usr/share/maven/ref/settings-docker.xml && \
    echo "</mirrors>" >> /usr/share/maven/ref/settings-docker.xml


# 将当前目录下的所有文件和文件夹复制到容器的 /app 目录
COPY ./server/  /app/server/

COPY ./pom.xml  /app/

# 打印文件目录结构，确保文件都已复制到容器
RUN ls -al  /app

WORKDIR /app

RUN mvn clean install -DskipTests -Dmaven.wagon.http.ssl.insecure=true -Dmaven.wagon.http.ssl.allowall=true

# 构建运行镜像
FROM registry.cn-hangzhou.aliyuncs.com/jongwong/eclipse-temurin:21-jre-jammy



# 复制构建好的 .jar 文件
COPY --from=build /app/server/target/*.jar /app/app.jar


# 暴露端口（Spring Boot 默认使用8080端口）
EXPOSE 8080

# 设置容器启动命令
ENTRYPOINT ["java", "-jar", "/app/app.jar", "--spring.config.additional-location=file:/app/"]
