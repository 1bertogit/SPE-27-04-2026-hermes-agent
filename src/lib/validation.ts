import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo de 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('E-mail inválido'),
    crm_number: z.string().min(4, 'CRM inválido'),
    password: z
      .string()
      .min(8, 'Mínimo de 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Deve conter pelo menos um número'),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Senhas não coincidem',
    path: ['confirm_password'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const patientSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z
    .string()
    .min(11, 'CPF inválido')
    .max(14, 'CPF inválido'),
  date_of_birth: z.string().optional(),
  gender: z.enum(['Masculino', 'Feminino', 'Outro']),
  phone: z.string().min(10, 'Telefone inválido'),
  email: z.string().email('E-mail inválido').or(z.literal('')).optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  classification: z.enum(['I', 'II', 'III', 'IV']),
  medical_history: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  notes: z.string().optional(),
  weight_kg: z.string().optional(),
  height_cm: z.string().optional(),
  smoker: z.boolean().optional(),
  smoking_cessation_date: z.string().optional(),
  how_found_clinic: z.string().optional(),
  procedure_interest: z.string().optional(),
  family_history: z.string().optional(),
});

export type PatientFormData = z.infer<typeof patientSchema>;

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome obrigatório'),
  crm_number: z.string().optional(),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  clinic_name: z.string().optional(),
  clinic_address: z.string().optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
