migrate(
  app => {
    const galleryImages = app.findCollectionByNameOrId('gallery_images');

    if (!galleryImages.fields.getByName('uploadBatchId')) {
      galleryImages.fields.add(
        new TextField({
          name: 'uploadBatchId',
          required: false,
          presentable: false,
          max: 255,
        })
      );
    }

    if (!galleryImages.fields.getByName('clientUploadId')) {
      galleryImages.fields.add(
        new TextField({
          name: 'clientUploadId',
          required: false,
          presentable: false,
          max: 255,
        })
      );
    }

    try {
      galleryImages.addIndex(
        'idx_gallery_images_upload_identity',
        true,
        'uploadBatchId, clientUploadId',
        "uploadBatchId != '' AND clientUploadId != ''"
      );
    } catch (_) {}

    app.save(galleryImages);

    try {
      app.findCollectionByNameOrId('upload_batches');
      return;
    } catch (_) {}

    const uploadBatches = new Collection({
      type: 'base',
      name: 'upload_batches',
      system: false,
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        new TextField({
          name: 'ownerId',
          required: true,
          presentable: false,
          max: 255,
        }),
        new TextField({
          name: 'targetType',
          required: true,
          max: 64,
        }),
        new TextField({
          name: 'targetId',
          required: true,
          max: 255,
        }),
        new TextField({
          name: 'targetName',
          required: false,
          max: 255,
        }),
        new SelectField({
          name: 'status',
          required: true,
          maxSelect: 1,
          values: ['open', 'cancelling', 'completed', 'cancelled'],
        }),
      ],
      indexes: [
        'CREATE INDEX idx_upload_batches_owner_status ON upload_batches (ownerId, status)',
        'CREATE INDEX idx_upload_batches_target ON upload_batches (targetType, targetId)',
      ],
    });

    app.save(uploadBatches);
  },
  app => {
    try {
      const uploadBatches = app.findCollectionByNameOrId('upload_batches');
      app.delete(uploadBatches);
    } catch (_) {}

    try {
      const galleryImages = app.findCollectionByNameOrId('gallery_images');
      galleryImages.fields.removeByName('uploadBatchId');
      galleryImages.fields.removeByName('clientUploadId');
      app.save(galleryImages);
    } catch (_) {}
  }
);
