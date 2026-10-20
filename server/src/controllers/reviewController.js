import Joi from 'joi';
import { Review } from '../models/Review.js';

const createSchema = Joi.object({
  mealCode: Joi.string().trim().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().allow('', null),
  reviewedBy: Joi.string().hex().length(24)
});

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

// POST /api/reviews
export async function createReview(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const review = await Review.create(value);
    res.status(201).json({ review });
  } catch (err) {
    // Duplicate (mealCode, reviewedBy) from the unique index
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already reviewed this meal' });
    }
    next(err);
  }
}

// GET /api/reviews
export async function getAllReviews(req, res, next) {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) { next(err); }
}

// GET /api/reviews/:id
export async function getReview(req, res, next) {
  try {
    // A malformed id can never match a document, so treat it as not found
    // rather than letting Mongoose throw a CastError (500).
    if (!OBJECT_ID_RE.test(req.params.id)) {
      return res.status(404).json({ message: 'Review not found' });
    }
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json({ review });
  } catch (err) { next(err); }
}

// GET /api/reviews/popular?minReviews=2
export async function getPopularMeals(req, res, next) {
  try {
    let minReviews = 2;

    if (req.query.minReviews !== undefined) {
      const raw = req.query.minReviews;
      // Must be a single string of digits, value >= 1. Rejects '', '0', '2.5',
      // '-1', 'abc' and repeated params (which Express parses as arrays).
      if (typeof raw !== 'string' || !/^\d+$/.test(raw) || Number(raw) < 1) {
        return res.status(400).json({ message: 'minReviews must be a positive integer' });
      }
      minReviews = Number(raw);
    }

    const popular = await Review.aggregate([
      {
        $group: {
          _id: '$mealCode',
          reviewCount: { $sum: 1 },
          averageRating: { $avg: '$rating' }
        }
      },
      { $match: { reviewCount: { $gte: minReviews } } },
      { $sort: { reviewCount: -1, _id: 1 } },
      {
        $project: {
          _id: 0,
          mealCode: '$_id',
          reviewCount: 1,
          averageRating: 1
        }
      }
    ]);

    res.json({ popular });
  } catch (err) { next(err); }
}