export interface Reaction {
  likes: number;
  dislikes: number;
}

export interface Post {
  id?: number;
  title: string;
  body: string;
  tags?: string[];
  reactions?: Reaction | number;
  views?: number;
  userId: number;
  isDeleted?: boolean;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  skip: number;
  limit: number;
}

export interface CommentUser {
  id: number;
  username: string;
  fullName?: string;
}

export interface Comment {
  id: number;
  body: string;
  postId: number;
  likes: number;
  user: CommentUser;
  createdAt?: string;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
  skip: number;
  limit: number;
}

export interface TagItem {
  slug: string;
  name: string;
  url?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}
