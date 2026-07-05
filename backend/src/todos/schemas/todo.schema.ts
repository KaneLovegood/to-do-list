import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TodoDocument = HydratedDocument<Todo>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class Todo {
  @Prop({ required: true, trim: true, maxlength: 120 })
  title!: string;

  @Prop({ default: '', trim: true, maxlength: 500 })
  description!: string;

  @Prop({ default: false })
  completed!: boolean;

  @Prop({ type: String, default: null })
  startDate!: string | null;

  @Prop({ type: String, default: null })
  deadline!: string | null;

  @Prop({ type: String, default: null })
  imageUrl!: string | null;

  @Prop({ type: String, default: null })
  imagePublicId!: string | null;

  @Prop({ type: [String], default: [] })
  imageUrls!: string[];

  @Prop({ type: [String], default: [] })
  imagePublicIds!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);

TodoSchema.index({ createdAt: -1 });
