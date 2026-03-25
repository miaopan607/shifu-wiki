// === Activity Cascade: cleanup related records when activity is deleted ===

// After activity is deleted, delete all related activity_images
onRecordAfterDeleteSuccess(e => {
  const deletedActivityId = e.record.id;

  try {
    const images = e.app.findRecordsByFilter('activity_images', 'activity = {:activityId}', '', 0, 0, {
      activityId: deletedActivityId,
    });

    for (const image of images) {
      try {
        e.app.delete(image);
      } catch (deleteError) {
        console.log('[activity cascade] failed to delete activity_image:', image.id, deleteError);
      }
    }

    if (images.length > 0) {
      console.log(
        '[activity cascade] deleted',
        images.length,
        'activity_images after activity deletion:',
        deletedActivityId
      );
    }
  } catch (error) {
    console.log(
      '[activity cascade] failed to clean up activity_images after activity deletion:',
      deletedActivityId,
      error
    );
  }

  return e.next();
}, 'activities');
