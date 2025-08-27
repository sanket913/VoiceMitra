import mongoose from 'mongoose';

export interface IQuestion extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  language: string;
  subject?: string;
  difficulty?: string;
  isVoiceInput: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
  },
  language: {
    type: String,
    required: true,
    default: 'en',
  },
  subject: {
    type: String,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate',
  },
  isVoiceInput: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for better query performance
QuestionSchema.index({ userId: 1, createdAt: -1 });
QuestionSchema.index({ userId: 1, subject: 1 });

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);