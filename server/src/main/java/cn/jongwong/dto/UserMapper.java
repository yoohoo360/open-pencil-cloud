package main.java.cn.jongwong.dto;

import cn.jongwong.domain.entity.User;
import cn.jongwong.domain.entity.UserRole;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * MapStruct mapper for User entity to UserDTO conversion.
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {



    @Mapping(target = "password", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "lastLoginAt", ignore = true)
    @Mapping(target = "roles", ignore = true)
    User toEntity(UserDTO userDTO);

    default Set<String> mapRoles(Set<UserRole> roles) {
        return roles == null ? Set.of() :
                roles.stream()
                        .map(userRole -> userRole.getRole().getName())
                        .collect(Collectors.toSet());
    }
}
