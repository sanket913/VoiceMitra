import mongoose, { Schema, Document } from 'mongoose';

export interface IQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface IQuiz extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  questions: IQuizQuestion[];
  userAnswers?: number[];
  score?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true, min: 0, max: 3 },
  explanation: { type: String, required: true },
});

const QuizSchemaDefinition: mongoose.SchemaDefinition<IQuiz> = {
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  difficulty: { type: String, enum: ['beginner','intermediate','advanced'], required: true },
  language: { type: String, required: true, default: 'en' },
  questions: [QuizQuestionSchema],
  userAnswers: [{ type: Number, min: 0, max: 3 }],
  score: { type: Number, min: 0, max: 100 },
  completedAt: { type: Date },
};

const QuizSchema = new Schema<IQuiz>(QuizSchemaDefinition, { timestamps: true });

// Indexes
QuizSchema.index({ userId: 1, createdAt: -1 });
QuizSchema.index({ userId: 1, subject: 1 });

export default mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema);
