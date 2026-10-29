import { useCallback, useMemo, useState } from "react";

import * as categoryService from "@/services/categoryService";
import { useAppData } from "@/providers/AppProvider";
import { showApiErrorAlert } from "@/utils/errorHandler";

export function useCategories() {
  const {
    categories,
    setCategories,
    setServices,
    categoriesLoading,
    categoriesError,
    loadCategories,
  } = useAppData();
  const [itemLoading, setItemLoading] = useState(false);
  const [itemError, setItemError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const syncCategoryInServices = useCallback(
    (category) => {
      // Los servicios conservan una copia poblada que también debe actualizarse.
      const categoryData = {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        active: category.active,
        deletedAt: category.deletedAt,
      };

      setServices((currentServices) =>
        currentServices.map((service) => {
          const currentCategory = service.category;
          const currentCategoryId = String(
            currentCategory?._id ?? currentCategory ?? "",
          );

          if (
            currentCategoryId !== String(category._id) ||
            typeof currentCategory !== "object" ||
            currentCategory === null
          ) {
            return service;
          }

          return {
            ...service,
            category: { ...currentCategory, ...categoryData },
          };
        }),
      );
    },
    [setServices],
  );

  // Solo las categorías activas y no eliminadas se pueden asignar a un servicio.
  const availableCategories = useMemo(
    () => categories.filter((category) => category.active && !category.deletedAt),
    [categories],
  );

  const runMutation = useCallback(async (operation, onSuccess) => {
    setSubmitting(true);
    setItemError("");

    try {
      const result = await operation();
      onSuccess?.(result);
      return result;
    } catch (error) {
      await showApiErrorAlert(error);
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const getCategoryById = useCallback(async (id) => {
    setItemLoading(true);
    setItemError("");

    try {
      return await categoryService.getCategoryById(id);
    } catch (error) {
      const normalizedError = await showApiErrorAlert(error);
      setItemError(normalizedError.message);
      return null;
    } finally {
      setItemLoading(false);
    }
  }, []);

  const getCategoryBySlug = useCallback(async (slug) => {
    setItemLoading(true);
    setItemError("");

    try {
      return await categoryService.getCategoryBySlug(slug);
    } catch (error) {
      const normalizedError = await showApiErrorAlert(error);
      setItemError(normalizedError.message);
      return null;
    } finally {
      setItemLoading(false);
    }
  }, []);

  const createCategory = useCallback(
    (data) =>
      runMutation(() => categoryService.createCategory(data), (created) => {
        setCategories((current) => [
          ...current,
          { ...created, serviceCount: created.serviceCount ?? 0 },
        ]);
      }),
    [runMutation, setCategories],
  );

  const updateCategory = useCallback(
    (id, data) =>
      runMutation(() => categoryService.updateCategory(id, data), (updated) => {
        setCategories((current) =>
          current.map((category) =>
            category._id === id
              ? { ...updated, serviceCount: category.serviceCount ?? 0 }
              : category,
          ),
        );
        syncCategoryInServices(updated);
      }),
    [runMutation, setCategories, syncCategoryInServices],
  );

  const deleteCategory = useCallback(
    (id) =>
      runMutation(async () => {
        await categoryService.deleteCategory(id);
        return { id, deletedAt: new Date().toISOString() };
      }, ({ id: deletedId, deletedAt }) => {
        setCategories((current) =>
          current.map((category) =>
            category._id === deletedId
              ? { ...category, deletedAt, active: false }
              : category,
          ),
        );
      }),
    [runMutation, setCategories],
  );

  const restoreCategory = useCallback(
    (id) =>
      runMutation(() => categoryService.restoreCategory(id), (restored) => {
        setCategories((current) =>
          current.map((category) =>
            category._id === id
              ? { ...restored, serviceCount: category.serviceCount ?? 0 }
              : category,
          ),
        );
        syncCategoryInServices(restored);
      }),
    [runMutation, setCategories, syncCategoryInServices],
  );

  const changeCategoryActive = useCallback(
    (id, active) =>
      runMutation(
        () => categoryService.changeCategoryActive(id, active),
        (updated) => {
          setCategories((current) =>
            current.map((category) =>
              category._id === id
                ? { ...updated, serviceCount: category.serviceCount ?? 0 }
                : category,
            ),
          );
          syncCategoryInServices(updated);
        },
      ),
    [runMutation, setCategories, syncCategoryInServices],
  );

  return {
    categories,
    availableCategories,
    loading: categoriesLoading || itemLoading,
    error: itemError || categoriesError,
    submitting,
    loadCategories,
    getCategoryById,
    getCategoryBySlug,
    createCategory,
    updateCategory,
    deleteCategory,
    restoreCategory,
    changeCategoryActive,
  };
}