import mongoose, { Schema, model, type Document, type Model } from 'mongoose';

export interface Category {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryDocument extends Category, Document {
  _id: mongoose.Types.ObjectId;
}

const categorySchema = new Schema<CategoryDocument>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Indexes for query optimization
categorySchema.index({ name: 1 });
categorySchema.index({ isActive: 1, name: 1 }); // Compound index for filtering active categories


export const CategoryModel: Model<CategoryDocument> = (mongoose.models.Category as Model<CategoryDocument>) || model<CategoryDocument>(
  'Category',
  categorySchema
);
