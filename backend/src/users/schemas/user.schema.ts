import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ trim: true, maxlength: 50 })
  displayName?: string;

  @Prop({
    enum: ['female', 'male', 'non-binary', 'other', 'prefer-not-to-say'],
  })
  gender?: string;

  @Prop({ min: 1, max: 120 })
  age?: number;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ select: false })
  pendingPasswordHash?: string;

  @Prop({ type: Date })
  passwordChangedAt?: Date;

  @Prop({ required: true, default: false })
  isEmailVerified!: boolean;

  @Prop({ type: Date })
  emailVerifiedAt?: Date;

  @Prop({ trim: true })
  avatarUrl?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 });
