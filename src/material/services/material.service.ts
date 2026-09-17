/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import { ResourceType } from '@prisma/client';

import { MaterialRepository } from '../repositories/material.repository';

@Injectable()
export class MaterialService {
  constructor(private readonly materialRepository: MaterialRepository) {}

  // ============================================================
  // Create
  // ============================================================

  async createMaterial(data: {
    courseOfferingId: number;
    title: string;
    type: ResourceType;
    telegramChatId: string;
    telegramMessageId: number;
    telegramFileId?: string;
    caption?: string;
  }) {
    const sortOrder = await this.materialRepository.getNextSortOrder(
      data.courseOfferingId,
      data.type,
    );

    return this.materialRepository.create({
      ...data,
      sortOrder,
    });
  }
  // ============================================================
  // Get Materials
  // ============================================================

  async getMaterials(courseOfferingId: number, type: ResourceType) {
    return this.materialRepository.findByCourseOfferingType(
      courseOfferingId,
      type,
    );
  }

  // ============================================================
  // Get Courses with Materials
  // ============================================================

  async getCoursesWithMaterials(params: {
    departmentId: number;
    levelId: number;
    termId: number;
    trackId?: number;
  }) {
    return this.materialRepository.findCoursesWithMaterials(params);
  }

  // ============================================================
  // Get Course Offerings with Materials
  // ============================================================

  async getCourseOfferingsWithMaterials(params: {
    courseId: number;
    departmentId: number;
    levelId: number;
    termId: number;
    trackId?: number;
  }) {
    return this.materialRepository.findCourseOfferingsWithMaterials(params);
  }

  // ============================================================
  // Get Material Types
  // ============================================================

  async getTypesByCourseOffering(courseOfferingId: number) {
    return this.materialRepository.findTypesByCourseOffering(courseOfferingId);
  }

  // ============================================================
  // Get Materials by Course
  // ============================================================

  async getCourseOfferingsByCourse(courseId: number) {
    return this.materialRepository.findCourseOfferingsByCourse(courseId);
  }

  // ============================================================
  // Get Material By ID
  // ============================================================

  async getMaterialById(id: number) {
    return this.materialRepository.findById(id);
  }

  // ============================================================
  // Delete
  // ============================================================

  async deleteMaterial(id: number) {
    return this.materialRepository.delete(id);
  }
}
