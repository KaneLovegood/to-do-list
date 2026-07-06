import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

type ProfileUpdate = {
  displayName?: string;
  gender?: string;
  age?: number;
  avatarUrl?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findForAuthentication(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .select('+passwordHash +pendingPasswordHash')
      .exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdForAuthentication(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+passwordHash').exec();
  }

  async updateProfile(
    id: string,
    profile: ProfileUpdate,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, isEmailVerified: true },
        { $set: profile },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async updatePassword(
    id: string,
    passwordHash: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOneAndUpdate(
        { _id: id, isEmailVerified: true },
        { $set: { passwordHash, passwordChangedAt: new Date() } },
        { new: true },
      )
      .exec();
  }

  async prepareRegistration(
    email: string,
    pendingPasswordHash: string,
  ): Promise<UserDocument> {
    const cleanEmail = email.toLowerCase().trim();
    return this.userModel
      .findOneAndUpdate(
        { email: cleanEmail },
        {
          $set: { pendingPasswordHash },
          $setOnInsert: { email: cleanEmail, isEmailVerified: false },
        },
        { upsert: true, new: true },
      )
      .select('+passwordHash +pendingPasswordHash')
      .exec();
  }

  async completeRegistration(email: string): Promise<UserDocument | null> {
    const cleanEmail = email.toLowerCase().trim();
    const user = await this.findForAuthentication(cleanEmail);

    if (!user?.pendingPasswordHash) {
      return null;
    }

    return this.userModel
      .findOneAndUpdate(
        { _id: user._id, pendingPasswordHash: user.pendingPasswordHash },
        {
          $set: {
            passwordHash: user.pendingPasswordHash,
            isEmailVerified: true,
            emailVerifiedAt: new Date(),
          },
          $unset: { pendingPasswordHash: 1 },
        },
        { new: true },
      )
      .exec();
  }
}
