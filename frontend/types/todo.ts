export type Todo = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  startDate: string | null;
  deadline: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
};
