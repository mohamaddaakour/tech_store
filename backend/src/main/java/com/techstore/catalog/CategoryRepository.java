package com.techstore.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findBySlug(String slug);

    boolean existsByNameIgnoreCase(String name);

    List<Category> findAllByOrderByNameAsc();
}
