import { FilterQuery, Model, Types, Schema } from 'mongoose';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterDto } from '../common/filters/filter.dto';

// Nueva interfaz para definir campos anidados a popular
export interface NestedPopulateConfig {
  path: string;
  populate?: Array<{
    path: string;
    model?: string;
  }>;
}

export async function findWithFilters<T>(
  model: Model<T>,
  paginationDto: PaginationDto,
  filtersArray: FilterDto[] = [],
  populateFields: string[] = [],
  nestedPopulate: NestedPopulateConfig[] = [],
): Promise<{
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}> {
  console.log(
    '📥 PaginationDto recibido:',
    JSON.stringify(paginationDto, null, 2),
  );

  const page = Number(paginationDto.current || paginationDto.page || 1);
  const limit = Number(paginationDto.pageSize || paginationDto.limit || 10);
  const skip = (page - 1) * limit;

  const filterQuery: FilterQuery<T> = {};
  const populateFilters: Record<string, any> = {};

  const knownProperties = [
    '_start',
    '_end',
    '_sort',
    '_order',
    'page',
    'limit',
    'current',
    'pageSize',
    'sorters',
    'filters',
  ];

  console.log('🔍 Buscando filtros directos en paginationDto...');

  Object.keys(paginationDto as any).forEach((key) => {
    const dto: any = paginationDto as any;

    if (
      !knownProperties.includes(key) &&
      dto[key] !== undefined &&
      dto[key] !== null
    ) {
      console.log(`📝 Procesando filtro directo: ${key} eq "${dto[key]}"`);

      const value = dto[key];
      const stringValue = String(value);

      const isPopulateFilter = populateFields.some((field) =>
        key.startsWith(field + '.'),
      );

      if (isPopulateFilter) {
        populateFilters[key] = value;
      } else {
        if (key === '_id') {
          if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
            try {
              Object.assign(filterQuery, {
                [key]: new Types.ObjectId(stringValue),
              });
              console.log(`✅ _id convertido a ObjectId: ${stringValue}`);
            } catch {
              console.log(`❌ Error creando ObjectId para _id: ${stringValue}`);
            }
          } else {
            console.log(
              `⚠️ _id incompleto o inválido ignorado: "${stringValue}"`,
            );
          }
        } else if (key.includes('Id')) {
          try {
            Object.assign(filterQuery, {
              [key]: new Types.ObjectId(stringValue),
            });
          } catch {
            Object.assign(filterQuery, { [key]: stringValue });
          }
        } else {
          if (key === 'attended' && typeof value === 'string') {
            const boolValue = value.toLowerCase() === 'true';
            Object.assign(filterQuery, { [key]: boolValue });
            console.log(
              `✅ Campo ${key} convertido de "${value}" a boolean: ${boolValue}`,
            );
          } else {
            Object.assign(filterQuery, { [key]: value });
            console.log(`✅ Campo ${key} asignado directamente: ${value}`);
          }
        }
      }
    }
  });

  const sortOptions: any = {};

  const dtoAny: any = paginationDto as any;

  if (dtoAny.sorters && dtoAny.sorters.length > 0) {
    console.log('🔄 Sorter recibidos:', dtoAny.sorters);
    dtoAny.sorters.forEach((sorter: any) => {
      if (sorter.field) {
        const order = sorter.order?.toLowerCase() === 'desc' ? -1 : 1;
        sortOptions[sorter.field] = order;
        console.log(`🔄 Ordenando por: ${sorter.field} ${sorter.order}`);
      }
    });
  } else {
    if (dtoAny._sort && dtoAny._order) {
      const order = dtoAny._order.toLowerCase() === 'desc' ? -1 : 1;
      sortOptions[dtoAny._sort] = order;
    }
  }

  console.log('🔍 Filtros recibidos:', filtersArray);

  filtersArray.forEach((filter) => {
    const { field, operator = 'eq', value } = filter as any;
    if (!value && value !== 0 && value !== false) return;

    console.log(`📝 Procesando filtro: ${field} ${operator} "${value}"`);

    const isPopulateFilter = populateFields.some((popField) =>
      field.startsWith(popField + '.'),
    );

    if (isPopulateFilter) {
      populateFilters[field] = { operator, value };
    } else {
      processLocalFilter(filterQuery, field, operator, value);
    }
  });

  function processLocalFilter(
    filterQuery: any,
    field: string,
    operator: string,
    value: any,
  ) {
    const stringValue = String(value);

    switch (operator) {
      case 'eq':
        if (field === '_id') {
          if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
            try {
              Object.assign(filterQuery, {
                [field]: new Types.ObjectId(stringValue),
              });
              console.log(
                `✅ _id convertido a ObjectId en filtro local: ${stringValue}`,
              );
            } catch {
              console.log(
                `❌ Error creando ObjectId para _id en filtro local: ${stringValue}`,
              );
              return;
            }
          } else {
            console.log(
              `⚠️ _id incompleto o inválido ignorado en filtro local: "${stringValue}"`,
            );
            return;
          }
        } else if (field.includes('Id')) {
          try {
            Object.assign(filterQuery, {
              [field]: new Types.ObjectId(stringValue),
            });
          } catch {
            Object.assign(filterQuery, { [field]: stringValue });
          }
        } else {
          Object.assign(filterQuery, { [field]: value });
        }
        break;

      case 'contains':
        Object.assign(filterQuery, {
          [field]: { $regex: new RegExp(stringValue, 'i') },
        });
        break;

      case 'startswith':
        Object.assign(filterQuery, {
          [field]: { $regex: new RegExp(`^${stringValue}`, 'i') },
        });
        break;

      case 'endswith':
        Object.assign(filterQuery, {
          [field]: { $regex: new RegExp(`${stringValue}$`, 'i') },
        });
        break;

      case 'gt':
        Object.assign(filterQuery, {
          [field]: { $gt: isNaN(Number(value)) ? value : Number(value) },
        });
        break;

      case 'gte':
        Object.assign(filterQuery, {
          [field]: { $gte: isNaN(Number(value)) ? value : Number(value) },
        });
        break;

      case 'lt':
        Object.assign(filterQuery, {
          [field]: { $lt: isNaN(Number(value)) ? value : Number(value) },
        });
        break;

      case 'lte':
        Object.assign(filterQuery, {
          [field]: { $lte: isNaN(Number(value)) ? value : Number(value) },
        });
        break;

      case 'ne':
        Object.assign(filterQuery, { [field]: { $ne: value } });
        break;

      case 'in':
        Object.assign(filterQuery, {
          [field]: { $in: Array.isArray(value) ? value : [value] },
        });
        break;

      case 'nin':
        Object.assign(filterQuery, {
          [field]: { $nin: Array.isArray(value) ? value : [value] },
        });
        break;

      default:
        Object.assign(filterQuery, { [field]: value });
        break;
    }
  }

  function createAggregationPipeline() {
    const pipeline: any[] = [];

    if (Object.keys(filterQuery).length > 0) {
      console.log(
        '🎯 FilterQuery inicial:',
        JSON.stringify(filterQuery, null, 2),
      );
      pipeline.push({ $match: filterQuery });
    }

    // Populate de campos simples (nivel raíz)
    populateFields.forEach((field) => {
      const schema = model.schema;
      const schemaPath = schema.path(field);

      if (schemaPath && schemaPath instanceof Schema.Types.ObjectId) {
        const refModel = (schemaPath as any).options.ref;
        if (refModel) {
          const refCollection = model.db.model(refModel).collection.name;

          pipeline.push({
            $lookup: {
              from: refCollection,
              localField: field,
              foreignField: '_id',
              as: field + '_temp',
            },
          });

          pipeline.push({
            $unwind: {
              path: `$${field}_temp`,
              preserveNullAndEmptyArrays: true,
            },
          });

          pipeline.push({
            $addFields: {
              [field]: `$${field}_temp`,
            },
          });

          pipeline.push({
            $unset: `${field}_temp`,
          });
        }
      }
    });

    // NUEVO: Procesar populate anidado en arrays
    nestedPopulate.forEach((config) => {
      const { path, populate = [] } = config;

      //console.log(`🔗 Procesando populate anidado para: ${path}`)
      // Guardar el _id original del documento para reagrupar después
      pipeline.push({
        $addFields: {
          _originalId: '$_id',
        },
      });

      // Unwind del array principal (ej: sessions)
      pipeline.push({
        $unwind: {
          path: `$${path}`,
          preserveNullAndEmptyArrays: true,
        },
      });

      // Procesar cada campo a popular dentro del array
      populate.forEach((popConfig) => {
        const { path: nestedPath, model: refModelName } = popConfig;
        const fullPath = `${path}.${nestedPath}`;

        let refCollection: string;

        if (refModelName) {
          refCollection = model.db.model(refModelName).collection.name;
        } else {
          try {
            const schema = model.schema;
            const arrayPath: any = schema.path(path);

            if (arrayPath && arrayPath.schema) {
              const nestedSchemaPath = arrayPath.schema.path(nestedPath);
              if (nestedSchemaPath) {
                const ref = nestedSchemaPath.options?.ref;
                if (ref) {
                  refCollection = model.db.model(ref).collection.name;
                } else {
                  console.warn(`⚠️ No se encontró 'ref' para ${fullPath}`);
                  return;
                }
              } else {
                console.warn(
                  `⚠️ No se encontró schema path para ${nestedPath}`,
                );
                return;
              }
            } else {
              console.warn(`⚠️ No se encontró schema para el array ${path}`);
              return;
            }
          } catch (error) {
            console.error(
              `❌ Error obteniendo schema para ${fullPath}:`,
              error,
            );
            return;
          }
        }

        // Verificar si es un array de ObjectIds o un ObjectId único
        const localField = `${path}.${nestedPath}`;

        // Lookup para poblar el campo
        pipeline.push({
          $lookup: {
            from: refCollection,
            localField,
            foreignField: '_id',
            as: `${fullPath}_populated`,
          },
        });

        pipeline.push({
          $addFields: {
            [fullPath]: {
              $cond: {
                if: { $isArray: `$${localField}` },
                then: `$${fullPath}_populated`,
                else: { $arrayElemAt: [`$${fullPath}_populated`, 0] },
              },
            },
          },
        });

        pipeline.push({ $unset: `${fullPath}_populated` });
      });

      // Reagrupar los documentos por _id original
      const groupStage: any = {
        $group: {
          _id: '$_originalId',
          [path]: { $push: `$${path}` },
        },
      };

      const schema = model.schema;

      schema.eachPath((pathName) => {
        // 🔥 Solo campos raíz (sin puntos)
        if (pathName.includes('.')) return;

        // 🔥 No pisar el array que se está rearmando
        if (pathName === path) return;

        // 🔥 No meter campos internos
        if (pathName.startsWith('_')) return;

        // (Opcional) puedes excluir __v si quieres
        // if (pathName === '__v') return;

        groupStage.$group[pathName] = { $first: `$${pathName}` };
      });

      pipeline.push(groupStage);

      pipeline.push({ $unset: '_originalId' });
    });

    // filtros sobre campos populados
    const populateMatchConditions: any = {};
    Object.keys(populateFilters).forEach((filterField) => {
      const filterConfig = populateFilters[filterField];
      const { operator = 'eq', value } =
        typeof filterConfig === 'object' && filterConfig.operator
          ? filterConfig
          : { operator: 'eq', value: filterConfig };

      switch (operator) {
        case 'eq':
          populateMatchConditions[filterField] = value;
          break;
        case 'contains':
          populateMatchConditions[filterField] = {
            $regex: new RegExp(String(value), 'i'),
          };
          break;
      }
    });

    if (Object.keys(populateMatchConditions).length > 0) {
      pipeline.push({ $match: populateMatchConditions });
      console.log(
        '🔍 Filtros aplicados a campos populados:',
        populateMatchConditions,
      );
    }

    if (Object.keys(sortOptions).length > 0) {
      pipeline.push({ $sort: sortOptions });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    return pipeline;
  }

  let items: T[];
  let totalItems: number;

  if (
    populateFields.length > 0 ||
    nestedPopulate.length > 0 ||
    Object.keys(populateFilters).length > 0
  ) {
    console.log('🔗 Usando agregación con $lookup');

    const pipeline = createAggregationPipeline();

    const countPipeline = [...pipeline, { $count: 'total' }];
    const itemsPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

    const [countResult, itemsResult] = await Promise.all([
      model.aggregate(countPipeline).exec(),
      model.aggregate(itemsPipeline).exec(),
    ]);

    totalItems = countResult.length > 0 ? countResult[0].total : 0;
    items = itemsResult as T[];

    console.log(
      '📊 Pipeline de agregación usado:',
      JSON.stringify(pipeline, null, 2),
    );
  } else {
    console.log('📋 Usando consulta tradicional sin $lookup');

    let query = model.find(filterQuery);

    query =
      Object.keys(sortOptions).length > 0
        ? query.sort(sortOptions)
        : query.sort({ createdAt: -1 });

    totalItems = await model.countDocuments(filterQuery).exec();
    items = await query.skip(skip).limit(limit).exec();
  }

  const totalPages = Math.ceil(totalItems / limit);

  console.log(
    `📊 Resultado: ${items.length} items de ${totalItems} total (página ${page}/${totalPages})`,
  );

  return {
    items,
    totalItems,
    totalPages,
    currentPage: page,
  };
}
