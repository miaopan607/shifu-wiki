migrate(
	(app) => {
		const uploadBatches = app.findCollectionByNameOrId('upload_batches');

		if (!uploadBatches.fields.getByName('snapshotCoverName')) {
			uploadBatches.fields.add(
				new TextField({
					name: 'snapshotCoverName',
					required: false,
					presentable: false,
					max: 255,
				}),
			);
		}

		if (!uploadBatches.fields.getByName('snapshotFile')) {
			uploadBatches.fields.add(
				new FileField({
					name: 'snapshotFile',
					required: false,
					presentable: false,
					maxSelect: 1,
					maxSize: 10485760,
					mimeTypes: [],
					thumbs: [],
					protected: false,
				}),
			);
		}

		app.save(uploadBatches);
	},
	(app) => {
		try {
			const uploadBatches = app.findCollectionByNameOrId('upload_batches');
			uploadBatches.fields.removeByName('snapshotCoverName');
			uploadBatches.fields.removeByName('snapshotFile');
			app.save(uploadBatches);
		} catch (_) {}
	},
);
