import ImageManager from "@/features/images/components/ImageManager";

// Reutiliza el gestor de imágenes sin guardar hasta que se envía el formulario del perfil.
export default function ProfileAvatarEditor({
  manager,
  entityId,
  onDraftDirtyChange,
}) {
  return (
    <section className="account-avatar-editor" aria-labelledby="avatar-editor-title">
      <h3 id="avatar-editor-title">Avatar</h3>
      <ImageManager
        manager={manager}
        entityId={entityId}
        entityType="profile"
        maxImages={1}
        title="Avatar"
        description="Cada perfil puede tener un único avatar. Edita el existente para sustituirlo."
        saveNotice="Guarda el avatar para aplicar los cambios. Si cierras antes, los cambios pendientes se descartarán."
        onDraftDirtyChange={onDraftDirtyChange}
      />
    </section>
  );
}