import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isObjectIdOrHexString, Model } from 'mongoose';
import { Todo, TodoDocument } from './schemas/todo.schema';

export type CreateTodoRecord = Pick<
  Todo,
  | 'title'
  | 'description'
  | 'completed'
  | 'startDate'
  | 'deadline'
  | 'imageUrl'
  | 'imagePublicId'
  | 'imageUrls'
  | 'imagePublicIds'
  | 'userId'
>;

export type UpdateTodoRecord = Partial<Omit<CreateTodoRecord, 'userId'>>;

@Injectable()
export class TodosRepository {
  constructor(
    @InjectModel(Todo.name) private readonly todoModel: Model<Todo>,
  ) {}

  create(data: CreateTodoRecord): Promise<TodoDocument> {
    return this.todoModel.create(data);
  }

  findAll(userId: string): Promise<TodoDocument[]> {
    return this.todoModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async migrateLegacyDates(): Promise<number> {
    const result = await this.todoModel
      .updateMany(
        { startDate: null, deadline: { $type: 'string' } },
        [{ $set: { startDate: '$deadline', deadline: null } }],
        { updatePipeline: true },
      )
      .exec();

    return result.modifiedCount;
  }

  findById(id: string, userId: string): Promise<TodoDocument | null> {
    if (!isObjectIdOrHexString(id)) {
      return Promise.resolve(null);
    }

    return this.todoModel.findOne({ _id: id, userId }).exec();
  }

  update(id: string, userId: string, data: UpdateTodoRecord): Promise<TodoDocument | null> {
    if (!isObjectIdOrHexString(id)) {
      return Promise.resolve(null);
    }

    return this.todoModel
      .findOneAndUpdate({ _id: id, userId }, data, { new: true, runValidators: true })
      .exec();
  }

  delete(id: string, userId: string): Promise<TodoDocument | null> {
    if (!isObjectIdOrHexString(id)) {
      return Promise.resolve(null);
    }

    return this.todoModel.findOneAndDelete({ _id: id, userId }).exec();
  }
}
