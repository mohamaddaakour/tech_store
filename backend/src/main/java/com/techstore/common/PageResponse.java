package com.techstore.common;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/**
 * A trimmed, stable envelope for paginated results.
 *
 * <p>Why not just return Spring's {@code Page<T>} directly? Because its JSON shape is an
 * implementation detail of Spring Data, not an API contract. It serializes a large, awkward
 * object (including a nested {@code pageable} with {@code sort.sorted}, {@code unpaged},
 * {@code offset}…), and Spring Boot logs a warning about exactly this. Worse, upgrading Spring
 * Data can change that shape and break clients.
 *
 * <p>This record exposes only what a client actually needs to render a pager, and it will not
 * change underneath the frontend.
 *
 * @param page       zero-based page index, matching what the client sent
 * @param totalPages useful directly: the frontend does not have to divide and round
 */
public record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last) {

    /**
     * Wraps a {@link Page} of entities, mapping each one to its DTO.
     *
     * <p>Taking a mapper function rather than pre-mapped content means the conversion happens
     * inside the caller's transaction, which is required while lazy associations are still
     * attached.
     */
    public static <E, D> PageResponse<D> of(Page<E> page, Function<E, D> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast());
    }
}
