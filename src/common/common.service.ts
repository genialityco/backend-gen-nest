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
  console.log('📥 PaginationDto recibido:', JSON.stringify(paginationDto, null, 2));
  
  const page = Number(paginationDto.current || paginationDto.page || 1);
  const limit = Number(paginationDto.pageSize || paginationDto.limit || 10);
  const skip = (page - 1) * limit;

  const filterQuery: FilterQuery<T> = {};
  const populateFilters: Record<string, any> = {};

  const knownProperties = [
    '_start', '_end', '_sort', '_order', 'page', 'limit', 
    'current', 'pageSize', 'sorters', 'filters'
  ];
  
  console.log('🔍 Buscando filtros directos en paginationDto...');
  
  Object.keys(paginationDto).forEach((key) => {
    if (!knownProperties.includes(key) && paginationDto[key] !== undefined && paginationDto[key] !== null) {
      console.log(`📝 Procesando filtro directo: ${key} eq "${paginationDto[key]}"`);
      
      const value = paginationDto[key];
      const stringValue = String(value);
      
      const isPopulateFilter = populateFields.some(field => key.startsWith(field + '.'));
      
      if (isPopulateFilter) {
        populateFilters[key] = value;
      } else {
        if (key === '_id') {
          if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
            try {
              Object.assign(filterQuery, { [key]: new Types.ObjectId(stringValue) });
              console.log(`✅ _id convertido a ObjectId: ${stringValue}`);
            } catch {
              console.log(`❌ Error creando ObjectId para _id: ${stringValue}`);
            }
          } else {
            console.log(`⚠️ _id incompleto o inválido ignorado: "${stringValue}"`);
          }
        } else if (key.includes('Id')) {
          try {
            Object.assign(filterQuery, { [key]: new Types.ObjectId(stringValue) });
          } catch {
            Object.assign(filterQuery, { [key]: stringValue });
          }
        } else {
          if (key === 'attended' && typeof value === 'string') {
            const boolValue = value.toLowerCase() === 'true';
            Object.assign(filterQuery, { [key]: boolValue });
            console.log(`✅ Campo ${key} convertido de "${value}" a boolean: ${boolValue}`);
          } else {
            Object.assign(filterQuery, { [key]: value });
            console.log(`✅ Campo ${key} asignado directamente: ${value}`);
          }
        }
      }
    }
  });

  const sortOptions: any = {};
  
  if (paginationDto.sorters && paginationDto.sorters.length > 0) {
    console.log('🔄 Sorter recibidos:', paginationDto.sorters);
    paginationDto.sorters.forEach((sorter) => {
      if (sorter.field) {
        const order = sorter.order?.toLowerCase() === 'desc' ? -1 : 1;
        sortOptions[sorter.field] = order;
        console.log(`🔄 Ordenando por: ${sorter.field} ${sorter.order}`);
      }
    });
  } else {
    if (paginationDto._sort && paginationDto._order) {
      const order = paginationDto._order.toLowerCase() === 'desc' ? -1 : 1;
      sortOptions[paginationDto._sort] = order;
    }
  }

  console.log('🔍 Filtros recibidos:', filtersArray);

  filtersArray.forEach((filter) => {
    const { field, operator = 'eq', value } = filter;
    if (!value && value !== 0 && value !== false) return;

    console.log(`📝 Procesando filtro: ${field} ${operator} "${value}"`);

    const isPopulateFilter = populateFields.some(popField => field.startsWith(popField + '.'));
    
    if (isPopulateFilter) {
      if (!populateFilters[field]) {
        populateFilters[field] = {};
      }
      populateFilters[field] = { operator, value };
    } else {
      processLocalFilter(filterQuery, field, operator, value);
    }
  });

  function processLocalFilter(filterQuery: any, field: string, operator: string, value: any) {
    const stringValue = String(value);

    switch (operator) {
      case 'eq':
        if (field === '_id') {
          if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
            try {
              Object.assign(filterQuery, { [field]: new Types.ObjectId(stringValue) });
              console.log(`✅ _id convertido a ObjectId en filtro local: ${stringValue}`);
            } catch {
              console.log(`❌ Error creando ObjectId para _id en filtro local: ${stringValue}`);
              return;
            }
          } else {
            console.log(`⚠️ _id incompleto o inválido ignorado en filtro local: "${stringValue}"`);
            return;
          }
        } else if (field.includes('Id')) {
          try {
            Object.assign(filterQuery, { [field]: new Types.ObjectId(stringValue) });
          } catch {
            Object.assign(filterQuery, { [field]: stringValue });
          }
        } else {
          Object.assign(filterQuery, { [field]: value });
        }
        break;

      case 'contains':
        try {
          const regex = new RegExp(stringValue, 'i');
          Object.assign(filterQuery, { [field]: { $regex: regex } });
        } catch {
          Object.assign(filterQuery, { [field]: { $regex: stringValue, $options: 'i' } });
        }
        break;

      case 'startswith':
        try {
          const regex = new RegExp(`^${stringValue}`, 'i');
          Object.assign(filterQuery, { [field]: { $regex: regex } });
        } catch {
          Object.assign(filterQuery, { [field]: { $regex: `^${stringValue}`, $options: 'i' } });
        }
        break;

      case 'endswith':
        try {
          const regex = new RegExp(`${stringValue}$`, 'i');
          Object.assign(filterQuery, { [field]: { $regex: regex } });
        } catch {
          Object.assign(filterQuery, { [field]: { $regex: `${stringValue}$`, $options: 'i' } });
        }
        break;

      case 'gt':
        Object.assign(filterQuery, { [field]: { $gt: isNaN(Number(value)) ? value : Number(value) } });
        break;

      case 'gte':
        Object.assign(filterQuery, { [field]: { $gte: isNaN(Number(value)) ? value : Number(value) } });
        break;

      case 'lt':
        Object.assign(filterQuery, { [field]: { $lt: isNaN(Number(value)) ? value : Number(value) } });
        break;

      case 'lte':
        Object.assign(filterQuery, { [field]: { $lte: isNaN(Number(value)) ? value : Number(value) } });
        break;

      case 'ne':
        Object.assign(filterQuery, { [field]: { $ne: value } });
        break;

      case 'in':
        const arrayValue = Array.isArray(value) ? value : [value];
        Object.assign(filterQuery, { [field]: { $in: arrayValue } });
        break;

      case 'nin':
        const notInArrayValue = Array.isArray(value) ? value : [value];
        Object.assign(filterQuery, { [field]: { $nin: notInArrayValue } });
        break;

      default:
        if (field.includes('Id')) {
          try {
            Object.assign(filterQuery, { [field]: new Types.ObjectId(stringValue) });
          } catch {
            Object.assign(filterQuery, { [field]: stringValue });
          }
        } else if (typeof value === 'string') {
          try {
            const regex = new RegExp(stringValue, 'i');
            Object.assign(filterQuery, { [field]: { $regex: regex } });
          } catch {
            Object.assign(filterQuery, { [field]: { $regex: stringValue, $options: 'i' } });
          }
        } else {
          Object.assign(filterQuery, { [field]: value });
        }
        break;
    }
  }

  function createAggregationPipeline() {
    const pipeline: any[] = [];

    if (Object.keys(filterQuery).length > 0) {
      console.log('🎯 FilterQuery inicial:', JSON.stringify(filterQuery, null, 2));
      pipeline.push({ $match: filterQuery });
    }

    // Procesar populate de campos simples (nivel raíz)
    populateFields.forEach(field => {
      const schema = model.schema;
      const schemaPath = schema.path(field);
      
      if (schemaPath && schemaPath instanceof Schema.Types.ObjectId) {
        const refModel = schemaPath.options.ref;
        if (refModel) {
          const refCollection = model.db.model(refModel).collection.name;
          
          pipeline.push({
            $lookup: {
              from: refCollection,
              localField: field,
              foreignField: '_id',
              as: field + '_temp'
            }
          });

          pipeline.push({
            $unwind: {
              path: `$${field}_temp`,
              preserveNullAndEmptyArrays: true
            }
          });

          pipeline.push({
            $addFields: {
              [field]: `$${field}_temp`
            }
          });

          pipeline.push({
            $unset: `${field}_temp`
          });
        }
      }
    });

    // NUEVO: Procesar populate anidado en arrays
    nestedPopulate.forEach(config => {
      const { path, populate = [] } = config;
      
      //console.log(`🔗 Procesando populate anidado para: ${path}`)
      // Guardar el _id original del documento para reagrupar después
      pipeline.push({
        $addFields: {
          _originalId: '$_id'
        }
      });

      // Unwind del array principal (ej: sessions)
      pipeline.push({
        $unwind: {
          path: `$${path}`,
          preserveNullAndEmptyArrays: true
        }
      });

      // Procesar cada campo a popular dentro del array
      populate.forEach(popConfig => {
        const { path: nestedPath, model: refModelName } = popConfig;
        const fullPath = `${path}.${nestedPath}`;

        // Intentar obtener el modelo de referencia
        let refCollection: string;
        
        if (refModelName) {
          // Si se proporciona el nombre del modelo explícitamente
          refCollection = model.db.model(refModelName).collection.name;
        } else {
          // Intentar obtenerlo del schema
          try {
            const schema = model.schema;
            const arrayPath = schema.path(path);
            
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
                console.warn(`⚠️ No se encontró schema path para ${nestedPath}`);
                return;
              }
            } else {
              console.warn(`⚠️ No se encontró schema para el array ${path}`);
              return;
            }
          } catch (error) {
            console.error(`❌ Error obteniendo schema para ${fullPath}:`, error);
            return;
          }
        }

        // Verificar si es un array de ObjectIds o un ObjectId único
        const localField = `${path}.${nestedPath}`;
        
        // Lookup para poblar el campo
        pipeline.push({
          $lookup: {
            from: refCollection,
            localField: localField,
            foreignField: '_id',
            as: `${fullPath}_populated`
          }
        });

        // Si es un array de referencias, mantener como array
        // Si es una referencia única, hacer unwind
        pipeline.push({
          $addFields: {
            [fullPath]: {
              $cond: {
                if: { $isArray: `$${localField}` },
                then: `$${fullPath}_populated`,
                else: { $arrayElemAt: [`$${fullPath}_populated`, 0] }
              }
            }
          }
        });

        // Limpiar campo temporal
        pipeline.push({
          $unset: `${fullPath}_populated`
        });
      });

      // Reagrupar los documentos por _id original
      const groupStage: any = {
        $group: {
          _id: '$_originalId',
          [path]: { $push: `$${path}` }
        }
      };

      // Mantener todos los campos del documento raíz
      const schema = model.schema;
      schema.eachPath((pathName) => {
        if (pathName !== '_id' && pathName !== path && !pathName.startsWith('_')) {
          groupStage.$group[pathName] = { $first: `$${pathName}` };
        }
      });

      pipeline.push(groupStage);

      // Restaurar el _id original
      pipeline.push({
        $addFields: {
          _id: '$_id'
        }
      });

      pipeline.push({
        $unset: '_originalId'
      });
    });

    // Aplicar filtros de campos populados
    const populateMatchConditions: any = {};
    Object.keys(populateFilters).forEach(filterField => {
      const filterConfig = populateFilters[filterField];
      const { operator = 'eq', value } = typeof filterConfig === 'object' && filterConfig.operator 
        ? filterConfig 
        : { operator: 'eq', value: filterConfig };

      const fieldName = filterField;
      
      switch (operator) {
        case 'eq':
          populateMatchConditions[fieldName] = value;
          break;
        case 'contains':
          populateMatchConditions[fieldName] = { 
            $regex: new RegExp(String(value), 'i') 
          };
          break;
        case 'startswith':
          populateMatchConditions[fieldName] = { 
            $regex: new RegExp(`^${String(value)}`, 'i') 
          };
          break;
        case 'endswith':
          populateMatchConditions[fieldName] = { 
            $regex: new RegExp(`${String(value)}$`, 'i') 
          };
          break;
        case 'gt':
          populateMatchConditions[fieldName] = { $gt: value };
          break;
        case 'gte':
          populateMatchConditions[fieldName] = { $gte: value };
          break;
        case 'lt':
          populateMatchConditions[fieldName] = { $lt: value };
          break;
        case 'lte':
          populateMatchConditions[fieldName] = { $lte: value };
          break;
        case 'ne':
          populateMatchConditions[fieldName] = { $ne: value };
          break;
        case 'in':
          const arrayValue = Array.isArray(value) ? value : [value];
          populateMatchConditions[fieldName] = { $in: arrayValue };
          break;
        case 'nin':
          const notInArrayValue = Array.isArray(value) ? value : [value];
          populateMatchConditions[fieldName] = { $nin: notInArrayValue };
          break;
      }
    });

    if (Object.keys(populateMatchConditions).length > 0) {
      pipeline.push({ $match: populateMatchConditions });
      console.log('🔍 Filtros aplicados a campos populados:', populateMatchConditions);
    }

    // Ordenamiento
    if (Object.keys(sortOptions).length > 0) {
      pipeline.push({ $sort: sortOptions });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    return pipeline;
  }

  let items: T[];
  let totalItems: number;

  // Usar agregación si hay campos populados o populate anidado
  if (populateFields.length > 0 || nestedPopulate.length > 0 || Object.keys(populateFilters).length > 0) {
    console.log('🔗 Usando agregación con $lookup');
    
    const pipeline = createAggregationPipeline();
    
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: "total" });
    
    const itemsPipeline = [...pipeline];
    itemsPipeline.push({ $skip: skip });
    itemsPipeline.push({ $limit: limit });

    const [countResult, itemsResult] = await Promise.all([
      model.aggregate(countPipeline).exec(),
      model.aggregate(itemsPipeline).exec()
    ]);

    totalItems = countResult.length > 0 ? countResult[0].total : 0;
    items = itemsResult as T[];

    console.log('📊 Pipeline de agregación usado:', JSON.stringify(pipeline, null, 2));
  } else {
    console.log('📋 Usando consulta tradicional sin $lookup');
    
    let query = model.find(filterQuery);

    if (Object.keys(sortOptions).length > 0) {
      query = query.sort(sortOptions);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    totalItems = await model.countDocuments(filterQuery).exec();
    items = await query.skip(skip).limit(limit).exec();
  }

  const totalPages = Math.ceil(totalItems / limit);

  console.log(`📊 Resultado: ${items.length} items de ${totalItems} total (página ${page}/${totalPages})`);

  return {
    items,
    totalItems,
    totalPages,
    currentPage: page,
  };
}