import { Injectable } from '@nestjs/common';

import { DepartmentRepository } from '../repositories/department.repository';
import { LevelRepository } from '../repositories/level.repository';
import { TermRepository } from '../repositories/term.repository';
import { AcademicYearRepository } from '../repositories/academic-year.repository';
import { TrackRepository } from '../repositories/track.repository';
import { CourseOfferingRepository } from '../repositories/course-offering.repository';

@Injectable()
export class AcademicService {
  constructor(
    private readonly departmentRepository: DepartmentRepository,
    private readonly levelRepository: LevelRepository,
    private readonly termRepository: TermRepository,
    private readonly academicYearRepository: AcademicYearRepository,
    private readonly trackRepository: TrackRepository,
    private readonly courseOfferingRepository: CourseOfferingRepository,
  ) {}

  // ============================================================
  // Departments
  // ============================================================

  async getDepartments() {
    return this.departmentRepository.findAll();
  }

  async getDepartmentById(id: number) {
    return this.departmentRepository.findById(id);
  }

  // ============================================================
  // Levels
  // ============================================================

  async getLevels() {
    return this.levelRepository.findAll();
  }

  async getLevelById(id: number) {
    return this.levelRepository.findById(id);
  }

  // ============================================================
  // Terms
  // ============================================================

  async getTerms() {
    return this.termRepository.findAll();
  }

  async getTermById(id: number) {
    return this.termRepository.findById(id);
  }

  // ============================================================
  // Academic Years
  // ============================================================

  async getAcademicYears() {
    return this.academicYearRepository.findAll();
  }

  async getAcademicYearById(id: number) {
    return this.academicYearRepository.findById(id);
  }

  // ============================================================
  // Tracks
  // ============================================================

  async getTracks() {
    return this.trackRepository.findAll();
  }

  async getTrackById(id: number) {
    return this.trackRepository.findById(id);
  }

  async getTracksByDepartmentId(departmentId: number) {
    return this.trackRepository.findByDepartmentId(departmentId);
  }

  // ============================================================
  // Course Offerings
  // ============================================================

  async getCourseOfferingById(id: number) {
    return this.courseOfferingRepository.findById(id);
  }

  async createCourseOffering(data: {
    courseId: number;
    departmentId: number;
    trackId?: number;
    levelId: number;
    termId: number;
    academicYearId: number;
  }) {
    return this.courseOfferingRepository.create(data);
  }

  async getCourseOfferings(params: {
    departmentId: number;
    trackId?: number;
    levelId: number;
    termId: number;
    academicYearId: number;
  }) {
    return this.courseOfferingRepository.findByContext(params);
  }

  async getCoursesByContext(params: {
    departmentId: number;
    trackId?: number;
    levelId: number;
    termId: number;
    academicYearId: number;
  }) {
    return this.courseOfferingRepository.findCourses(params);
  }

  async findCourseOffering(params: {
    courseId: number;
    departmentId: number;
    trackId?: number;
    levelId: number;
    termId: number;
    academicYearId: number;
  }) {
    return this.courseOfferingRepository.findOne(params);
  }
}
