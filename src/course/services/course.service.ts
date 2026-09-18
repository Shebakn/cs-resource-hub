import { Injectable } from '@nestjs/common';

import { CourseRepository } from '../repositories/course.repository';

@Injectable()
export class CourseService {
  constructor(private readonly courseRepository: CourseRepository) {}

  async getCourses() {
    return this.courseRepository.findAll();
  }

  async getCourseById(id: number) {
    return this.courseRepository.findById(id);
  }

  async findCourseByName(name: string) {
    return this.courseRepository.findByName(name);
  }

  async searchCoursesByName(name: string) {
    return this.courseRepository.searchByName(name);
  }

  async createCourse(data: { name: string; code?: string }) {
    return this.courseRepository.create(data);
  }

  async updateCourse(
    id: number,
    data: {
      name?: string;
      code?: string;
    },
  ) {
    return this.courseRepository.update(id, data);
  }

  async deleteCourse(id: number) {
    return this.courseRepository.delete(id);
  }

  async getCoursesPaginated(page: number, limit: number) {
    return this.courseRepository.getCoursesPaginated(page, limit);
  }
}
