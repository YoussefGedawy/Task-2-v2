import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    mealCode: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

// One review per user per meal. The filter keeps anonymous reviews (no
// reviewedBy) out of the constraint: without it, MongoDB indexes the missing
// field as null and a second anonymous review of the same meal would fail.
reviewSchema.index(
  { mealCode: 1, reviewedBy: 1 },
  { unique: true, partialFilterExpression: { reviewedBy: { $exists: true } } }
);

export const Review = mongoose.model('Review', reviewSchema);