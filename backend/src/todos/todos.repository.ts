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
>;

export type UpdateTodoRecord = Partial<CreateTodoRecord>;

@Injectable()
export class TodosRepository {
  constructor(
    @InjectModel(Todo.name) private readonly todoModel: Model<Todo>,
  ) {}

  create(data: CreateTodoRecord): Promise<TodoDocument> {
    return this.todoModel.create(data);
  }

  findAll(): Promise<TodoDocument[]> {
    return this.todoModel.find().sort({ createdAt: -1 }).exec();
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

  findById(id: string): Promise<TodoDocument | null> {
    if (!isObjectIdOrHexString(id)) {
      return Promise.resolve(null);
    }

    return this.todoModel.findById(id).exec();
  }

  update(id: string, data: UpdateTodoRecord): Promise<TodoDocument | null> {
    if (!isObjectIdOrHexString(id)) {
      return Promise.resolve(null);
    }

    return this.todoModel
      .findByIdAndUpdate(id, data, { new: true, runValidators: true })
      .exec();
  }

  delete(id: string): Promise<TodoDocument | null> {
    if (!isObjectIdOrHexString(id)) {
      return Promise.resolve(null);
    }

    return this.todoModel.findByIdAndDelete(id).exec();
  }
}
