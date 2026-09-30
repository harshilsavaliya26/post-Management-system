import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { Post, PostsResponse, CommentsResponse, TagItem } from '../models/post.model';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://dummyjson.com/posts';

  /**
   * Fetch paginated & sorted posts
   */
  getPosts(options: {
    limit?: number;
    skip?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    select?: string;
  } = {}): Observable<PostsResponse> {
    let params = new HttpParams();
    if (options.limit !== undefined) params = params.set('limit', options.limit);
    if (options.skip !== undefined) params = params.set('skip', options.skip);
    if (options.sortBy) params = params.set('sortBy', options.sortBy);
    if (options.order) params = params.set('order', options.order);
    if (options.select) params = params.set('select', options.select);

    return this.http.get<PostsResponse>(this.baseUrl, { params });
  }

  /**
   * Get single post by ID
   */
  getPostById(id: number): Observable<Post> {
    return this.http.get<Post>(`${this.baseUrl}/${id}`);
  }

  /**
   * Search posts by query string
   */
  searchPosts(query: string, limit = 12, skip = 0): Observable<PostsResponse> {
    const params = new HttpParams()
      .set('q', query)
      .set('limit', limit)
      .set('skip', skip);

    return this.http.get<PostsResponse>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Fetch all tags list
   */
  getTags(): Observable<string[]> {
    // DummyJSON returns either string[] or {slug, name, url}[]
    return this.http.get<any>(`${this.baseUrl}/tags`).pipe(
      map(response => {
        if (Array.isArray(response)) {
          return response.map(item => typeof item === 'string' ? item : item.slug || item.name);
        }
        return [];
      }),
      catchError(() => {
        // Fallback to tag-list endpoint
        return this.http.get<string[]>(`${this.baseUrl}/tag-list`).pipe(
          catchError(() => of(['history', 'american', 'crime', 'french', 'fiction', 'love', 'english', 'magical', 'mystery', 'life', 'peace']))
        );
      })
    );
  }

  /**
   * Filter posts by specific tag
   */
  getPostsByTag(tag: string, limit = 12, skip = 0): Observable<PostsResponse> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('skip', skip);

    return this.http.get<PostsResponse>(`${this.baseUrl}/tag/${encodeURIComponent(tag)}`, { params });
  }

  /**
   * Filter posts by specific user ID
   */
  getPostsByUser(userId: number, limit = 12, skip = 0): Observable<PostsResponse> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('skip', skip);

    return this.http.get<PostsResponse>(`${this.baseUrl}/user/${userId}`, { params });
  }

  /**
   * Get comments for a post
   */
  getPostComments(postId: number): Observable<CommentsResponse> {
    return this.http.get<CommentsResponse>(`${this.baseUrl}/${postId}/comments`);
  }

  /**
   * Create a new post
   */
  createPost(post: { title: string; body: string; tags: string[]; userId: number }): Observable<Post> {
    return this.http.post<Post>(`${this.baseUrl}/add`, post);
  }

  /**
   * Update existing post
   */
  updatePost(id: number, post: Partial<Post>): Observable<Post> {
    return this.http.put<Post>(`${this.baseUrl}/${id}`, post);
  }

  /**
   * Delete a post
   */
  deletePost(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}