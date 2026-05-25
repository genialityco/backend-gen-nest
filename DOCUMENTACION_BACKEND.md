# 📋 Documentación Backend - gen.iality

## 📖 Resumen General

**Backend Global** - API REST desarrollada con **NestJS** para la gestión integral de eventos, asistentes, usuarios, organizaciones y contenido relacionado. 

El backend implementa un sistema modular que permite la administración completa de eventos digitales, incluyendo gestión de asistentes, certificados, agendas, notificaciones, usuarios y mucho más. Utiliza **MongoDB** como base de datos y **Firebase** para autenticación y servicios complementarios.

---

## 🏗️ Estructura del Proyecto

```
backend-gen/
├── src/
│   ├── app.module.ts          # Módulo raíz de configuración
│   ├── app.controller.ts      # Controlador raíz
│   ├── app.service.ts         # Servicio raíz
│   ├── main.ts                # Punto de entrada de la aplicación
│   │
│   ├── auth/                  # 🔐 Módulo de Autenticación
│   │   ├── auth.service.ts    # Servicio de autenticación con Firebase
│   │   └── guards/            # Guards de protección de rutas
│   │
│   ├── user/                  # 👤 Módulo de Usuarios
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── dto/               # Data Transfer Objects
│   │   ├── interfaces/        # Interfaces TypeScript
│   │   └── schemas/           # Esquemas de MongoDB
│   │
│   ├── event/                 # 📅 Módulo de Eventos
│   │   ├── event.controller.ts
│   │   ├── event.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── attendee/              # 🎟️ Módulo de Asistentes
│   │   ├── attendee.controller.ts
│   │   ├── attendee.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── certificate/           # 📜 Módulo de Certificados
│   │   ├── certificate.controller.ts
│   │   ├── certificate.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── organization/          # 🏢 Módulo de Organizaciones
│   │   ├── organization.controller.ts
│   │   ├── organization.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── speakers/              # 🎤 Módulo de Ponentes
│   │   ├── speakers.controller.ts
│   │   ├── speakers.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── agenda/                # ⏰ Módulo de Agendas/Horarios
│   │   ├── agenda.controller.ts
│   │   ├── agenda.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── member/                # 👥 Módulo de Miembros
│   │   ├── member.controller.ts
│   │   ├── member.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── rooms/                 # 🚪 Módulo de Salas/Espacios
│   │   ├── rooms.controller.ts
│   │   ├── rooms.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── modules/               # 📦 Módulo de Módulos/Contenido
│   │   ├── modules.controller.ts
│   │   ├── modules.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── survey/                # 📊 Módulo de Encuestas
│   │   ├── survey.controller.ts
│   │   ├── survey.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── news/                  # 📰 Módulo de Noticias
│   │   ├── news.controller.ts
│   │   ├── news.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── documents/             # 📄 Módulo de Documentos
│   │   ├── documents.controller.ts
│   │   ├── documents.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── notifications/         # 🔔 Módulo de Notificaciones
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── notification-template/ # 📧 Módulo de Plantillas de Notificaciones
│   │   ├── notification-template.controller.ts
│   │   ├── notification-template.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── highlights/            # ⭐ Módulo de Destacados
│   │   ├── highlights.controller.ts
│   │   ├── highlights.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── posters/               # 🎨 Módulo de Pósters
│   │   ├── posters.controller.ts
│   │   ├── posters.service.ts
│   │   ├── dto/
│   │   ├── interfaces/
│   │   └── schemas/
│   │
│   ├── common/                # 🛠️ Servicios Comunes
│   │   ├── common.service.ts  # Servicio con utilidades compartidas
│   │   ├── response.dto.ts    # DTO estandarizado de respuestas
│   │   ├── dto/               # DTOs comunes (ej: Pagination)
│   │   └── filters/           # Filtros globales (ej: Exception Filters)
│   │
│   ├── config/                # ⚙️ Configuraciones
│   │   ├── firebase-admin.config.ts    # Inicialización de Firebase Admin
│   │   └── firebase.config.ts          # Configuración de Firebase
│   │
│   ├── utils/                 # 🔧 Utilidades
│   │   └── UploadController.ts # Controlador para carga de archivos
│   │
│   └── test/
│       ├── jest-e2e.json      # Configuración de tests E2E
│       └── app.e2e-spec.ts    # Tests de integración
│
├── package.json               # Dependencias del proyecto
├── tsconfig.json              # Configuración de TypeScript
├── tsconfig.build.json        # Configuración de TypeScript para build
├── nest-cli.json              # Configuración de NestJS CLI
└── README.md                  # Documentación básica

```

---

## 📦 Dependencias Principales

### Framework y Core
- **@nestjs/core**: Framework principal de NestJS
- **@nestjs/common**: Componentes comunes de NestJS
- **@nestjs/cli**: CLI para generación de componentes NestJS
- **reflect-metadata**: Metadatos para decoradores

### Base de Datos
- **mongoose**: ODM (Object Document Mapper) para MongoDB
- **@nestjs/mongoose**: Integración de Mongoose con NestJS

### Autenticación y Seguridad
- **firebase-admin**: SDK de Firebase Admin para autenticación y servicios
- **class-validator**: Validación de clases basada en decoradores
- **class-transformer**: Transformación de objetos (DTO)

### APIs y Comunicación
- **axios**: Cliente HTTP para realizar peticiones
- **node-fetch**: API Fetch para Node.js

### Carga de Archivos
- **@nestjs/platform-express**: Integración de Express con NestJS
- **multer**: Middleware para carga de archivos
- **@types/multer**: Tipos de TypeScript para Multer

### Programación y Tareas Programadas
- **@nestjs/schedule**: Soporte para tareas programadas (cron jobs)

### Configuración
- **@nestjs/config**: Gestión de variables de entorno

### Middlewares
- **morgan**: Logger HTTP para peticiones

### Utils
- **rxjs**: Librería sobrereactiva (utilizada por NestJS internamente)

---

## 🎯 Funcionalidad por Módulo

### 🔐 **auth** - Autenticación
- **Propósito**: Gestionar la autenticación y verificación de usuarios
- **Funcionalidades**:
  - Verificación de tokens de Firebase
  - Obtención de información de usuario desde Firebase
  - Guards para proteger rutas
  - Integración con Firebase Admin SDK

### 👤 **user** - Gestión de Usuarios
- **Propósito**: CRUD completo de usuarios del sistema
- **Operaciones**:
  - Crear, leer, actualizar y eliminar usuarios
  - Gestionar perfiles de usuario
  - Validación de datos de usuario

### 📅 **event** - Gestión de Eventos
- **Propósito**: Administración integral de eventos
- **Operaciones**:
  - Crear y actualizar eventos
  - Buscar eventos con paginación y filtros
  - Obtener detalles de eventos específicos
  - Gestionar el ciclo de vida completo del evento

### 🎟️ **attendee** - Gestión de Asistentes
- **Propósito**: Administrar participantes de eventos
- **Operaciones**:
  - Registrar asistentes a eventos
  - Gestionar estados de asistencia
  - Rastrear información de participantes
  - Validaciones de registro

### 📜 **certificate** - Generación de Certificados
- **Propósito**: Crear y gestionar certificados de asistencia
- **Operaciones**:
  - Generar certificados para asistentes
  - Gestionar plantillas de certificados
  - Validar asistencia para emisión de certificados

### 🏢 **organization** - Gestión de Organizaciones
- **Propósito**: Administrar organizaciones que hospedan eventos
- **Operaciones**:
  - CRUD de organizaciones
  - Gestionar información de organización
  - Asociar eventos con organizaciones

### 🎤 **speakers** - Gestión de Ponentes
- **Propósito**: Administrar ponentes y sus presentaciones
- **Operaciones**:
  - Registrar y gestionar ponentes
  - Asociar ponentes con eventos/agendas
  - Gestionar información de perfil de ponente

### ⏰ **agenda** - Programación de Horarios
- **Propósito**: Gestionar agendas y horarios de eventos
- **Operaciones**:
  - Crear agendas de eventos
  - Agendar sesiones y actividades
  - Gestionar horarios y salas asignadas
  - Sincronizar calendarios

### 👥 **member** - Gestión de Miembros
- **Propósito**: Administrar miembros de organizaciones
- **Operaciones**:
  - CRUD de miembros
  - Gestionar roles y permisos
  - Asociar miembros con organizaciones

### 🚪 **rooms** - Gestión de Salas
- **Propósito**: Administrar espacios y salas de eventos
- **Operaciones**:
  - Crear y gestionar salas
  - Configurar capacidad de salas
  - Asignar salas a sesiones de agenda

### 📦 **modules** - Módulos de Contenido
- **Propósito**: Gestionar contenido modular dentro de eventos
- **Operaciones**:
  - Crear módulos de aprendizaje/contenido
  - Agrupar sesiones en módulos
  - Gestionar progreso de módulos

### 📊 **survey** - Gestión de Encuestas
- **Propósito**: Crear y administrar encuestas de satisfacción/feedback
- **Operaciones**:
  - Crear encuestas
  - Gestionar preguntas
  - Recolectar respuestas
  - Analizar resultados

### 📰 **news** - Gestión de Noticias
- **Propósito**: Publicar y gestionar noticias relacionadas con eventos
- **Operaciones**:
  - Crear y publicar noticias
  - Gestionar contenido de noticias
  - Administrar fechas de publicación

### 📄 **documents** - Gestión de Documentos
- **Propósito**: Almacenar y gestionar documentos del evento
- **Operaciones**:
  - Cargar documentos
  - Organizar documentos por evento
  - Proporcionar acceso a descarga

### 🔔 **notifications** - Sistema de Notificaciones
- **Propósito**: Enviar notificaciones a usuarios y asistentes
- **Operaciones**:
  - Enviar notificaciones push
  - Enviar notificaciones por email
  - Gestionar preferencias de notificación
  - Rastrear estado de notificaciones

### 📧 **notification-template** - Plantillas de Notificaciones
- **Propósito**: Crear y gestionar plantillas reutilizables de notificaciones
- **Operaciones**:
  - Crear plantillas de email/push
  - Parametrizar plantillas
  - Gestionar versiones de plantillas

### ⭐ **highlights** - Destacados de Eventos
- **Propósito**: Gestionar contenido destacado de eventos
- **Operaciones**:
  - Crear y editar destacados
  - Agrupar contenido relevante
  - Gestionar visibilidad de destacados

### 🎨 **posters** - Gestión de Pósters
- **Propósito**: Administrar materiales visuales y pósters de eventos
- **Operaciones**:
  - Cargar pósters
  - Gestionar versiones
  - Organizar por evento

### 🛠️ **common** - Servicios Comunes
- **Propósito**: Proporcionar utilidades y servicios compartidos
- **Incluye**:
  - `findWithFilters()`: Función para búsqueda avanzada con filtros
  - `ResponseDto`: Estructura estandarizada de respuestas API
  - `PaginationDto`: DTO para manejo de paginación
  - `HttpExceptionFilter`: Filtro global para manejo de excepciones

---

## 🔧 Configuración y Variables de Entorno

### Requeridas
- **MONGO_URI**: URI de conexión a MongoDB
- **PORT**: Puerto en el que corre la aplicación (default: 3000)

### Firebase
- Las credenciales de Firebase se cargan desde el archivo de configuración
- Inicialización automática del Admin SDK

---

## 🚀 Cómo Ejecutar

### Instalación
```bash
npm install
```

### Desarrollo
```bash
# Con modo watch (auto-reload)
npm run start:dev

# Con debugging
npm run start:debug

# Inicio normal
npm run start
```

### Producción
```bash
npm run build
npm run start:prod
```

### Tests
```bash
# Tests unitarios
npm run test

# Tests con cobertura
npm run test:cov

# Tests E2E
npm run test:e2e

# Watch mode
npm run test:watch
```

---

## 📡 API Endpoints Principales

| Módulo | Endpoint Base | Métodos |
|--------|--------------|---------|
| Events | `/events` | GET, POST, PUT, DELETE |
| Attendees | `/attendees` | GET, POST, PUT, DELETE |
| Certificates | `/certificates` | GET, POST, PUT, DELETE |
| Organizations | `/organizations` | GET, POST, PUT, DELETE |
| Speakers | `/speakers` | GET, POST, PUT, DELETE |
| Agenda | `/agenda` | GET, POST, PUT, DELETE |
| Users | `/users` | GET, POST, PUT, DELETE |
| Members | `/members` | GET, POST, PUT, DELETE |
| Notifications | `/notifications` | GET, POST, PUT, DELETE |
| Upload | `/upload` | POST (Carga de archivos) |

---

## ⚙️ Características Principales

✅ **Autenticación con Firebase**: Sistema seguro basado en tokens  
✅ **Base de datos NoSQL**: MongoDB con Mongoose ODM  
✅ **Paginación avanzada**: Soporte para búsqueda y filtrado  
✅ **Carga de archivos**: Multer para gestión de uploads  
✅ **Notificaciones**: Sistema completo push/email  
✅ **CORS habilitado**: Acceso desde múltiples dominios  
✅ **Manejo de errores centralizado**: Exception Filters  
✅ **Logging HTTP**: Morgan para monitoreo de tráfico  
✅ **Tareas programadas**: Soporte para cron jobs  
✅ **Validación de datos**: Class-validator integrado  
✅ **DTOs tipados**: Class-transformer para transformación  

---

## 🔐 Seguridad

- Autenticación mediante Firebase Admin SDK
- Guards de protección en rutas críticas
- Validación de entrada con class-validator
- Manejo centralizado de excepciones
- Límite de tamaño de peticiones (50MB)
- CORS configurado para acceso seguro

---

## 📝 Estándares de Código

- **Arquitectura**: Modular y escalable basada en NestJS
- **Patrón**: Controlador → Servicio → Modelo
- **DTOs**: Transfer Objects para validación
- **Interfaces**: Tipado fuerte con TypeScript
- **Esquemas**: Modelos de MongoDB con Mongoose

---

## 🛠️ Herramientas de Desarrollo

- **ESLint**: Linting y formateo de código
- **Prettier**: Formateador de código
- **Jest**: Framework de testing
- **NestJS CLI**: Generación de componentes automática

---

## 📊 Próximas Mejoras/Notas

- Considerar agregar rate limiting
- Implementar caching con Redis (si es necesario)
- Documentación Swagger/OpenAPI
- Optimización de queries MongoDB
- Implementar soft deletes en entidades críticas

---

**Última actualización**: Marzo 2026  
**Versión**: 0.0.1  
**Estado**: En desarrollo

