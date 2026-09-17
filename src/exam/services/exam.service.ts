import { Injectable } from '@nestjs/common';
import { ResourceType } from '@prisma/client';

import { ExamRepository } from '../repositories/exam.repository';

@Injectable()
export class ExamService {
  constructor(private readonly examRepository: ExamRepository) {}

  // ============================================================
  // Student
  // ============================================================

  /**
   * Get course offerings that have exams for a course
   */
  async getCourseOfferingsByCourse(courseId: number) {
    return this.examRepository.findCourseOfferingsByCourse(courseId);
  }

  /**
   * Get available exam types
   */
  async getTypesByCourseOffering(courseOfferingId: number) {
    return this.examRepository.findTypesByCourseOffering(courseOfferingId);
  }

  /**
   * Get exams for students
   */
  async getExams(courseOfferingId: number, type: ResourceType) {
    return this.examRepository.findByCourseOfferingType(courseOfferingId, type);
  }

  // ============================================================
  // General
  // ============================================================

  /**
   * Get exam by ID
   */
  async getExamById(id: number) {
    return this.examRepository.findById(id);
  }

  // ============================================================
  // Admin
  // ============================================================

  /**
   * Create exam
   */
  async createExam(data: {
    courseOfferingId: number;
    title: string;
    type: ResourceType;
    telegramChatId: string;
    telegramMessageId: number;
    telegramFileId?: string;
    caption?: string;
  }) {
    return this.examRepository.create(data);
  }
  /**
   * Update exam
   */
  async updateExam(
    id: number,
    data: {
      title?: string;
      type?: ResourceType;
      caption?: string;
      telegramFileId?: string;
      telegramMessageId?: number;
      courseOfferingId?: number;
    },
  ) {
    return this.examRepository.update(id, data);
  }

  /**
   * Delete exam
   */
  async deleteExam(id: number) {
    return this.examRepository.delete(id);
  }

  /**
   * Get all exams
   */
  async getAllExams() {
    return this.examRepository.findAll();
  }

  /**
   * Get exams by course
   */
  async getExamsByCourse(courseId: number) {
    return this.examRepository.findByCourse(courseId);
  }

  /**
   * Get exams by academic year
   */
  async getExamsByAcademicYear(academicYearId: number) {
    return this.examRepository.findByAcademicYear(academicYearId);
  }

  /**
   * Get exams by course + academic year
   */
  async getExamsByCourseAndAcademicYear(
    courseId: number,
    academicYearId: number,
  ) {
    return this.examRepository.findByCourseAndAcademicYear(
      courseId,
      academicYearId,
    );
  }

  /**
   * Get exams by course offering + type
   */
  async getExamsByCourseOfferingType(
    courseOfferingId: number,
    type: ResourceType,
  ) {
    return this.examRepository.findByCourseOfferingTypeForAdmin(
      courseOfferingId,
      type,
    );
  }

  /**
   * Get courses that have exams for the selected context
   */
  async getCoursesWithExams(params: {
    departmentId: number;
    levelId: number;
    termId: number;
    trackId?: number;
  }) {
    return this.examRepository.findCoursesWithExams(params);
  }

  /**
   * Get course offerings that have exams
   * for the selected course + context
   */
  async getCourseOfferingsWithExams(params: {
    courseId: number;
    departmentId: number;
    levelId: number;
    termId: number;
    trackId?: number;
  }) {
    return this.examRepository.findCourseOfferingsWithExams(params);
  }
}
