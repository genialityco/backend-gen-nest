import { FilterQuery, Model, Types, PopulateOptions, Schema } from 'mongoose';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilterDto } from '../common/filters/filter.dto';

export async function findWithFilters<T>(
  model: Model<T>,
  paginationDto: PaginationDto,
  filtersArray: FilterDto[] = [],
  populateFields: string[] = [],
): Promise<{
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}> {
  console.log('📥 PaginationDto recibido:', JSON.stringify(paginationDto, null, 2));
  
  // Usar current/pageSize de refinedev como prioridad, fallback a page/limit
  const page = Number(paginationDto.current || paginationDto.page || 1);
  const limit = Number(paginationDto.pageSize || paginationDto.limit || 10);
  const skip = (page - 1) * limit;

  const filterQuery: FilterQuery<T> = {};
  const populateFilters: Record<string, any> = {}; // Filtros para campos populados

  // Propiedades conocidas de paginación
  const knownProperties = [
    '_start', '_end', '_sort', '_order', 'page', 'limit', 
    'current', 'pageSize', 'sorters', 'filters'
  ];
  
  console.log('🔍 Buscando filtros directos en paginationDto...');
  
  // Extraer cualquier propiedad adicional que no esté en la lista de propiedades conocidas
  Object.keys(paginationDto).forEach((key) => {
    if (!knownProperties.includes(key) && paginationDto[key] !== undefined && paginationDto[key] !== null) {
      console.log(`📝 Procesando filtro directo: ${key} eq "${paginationDto[key]}"`);
      
      const value = paginationDto[key];
      const stringValue = String(value);
      
      // Verificar si es un filtro para un campo populado
      const isPopulateFilter = populateFields.some(field => key.startsWith(field + '.'));
      
      if (isPopulateFilter) {
        populateFilters[key] = value;
      } else {
        // Aplicar la misma lógica que el operador 'eq' en los filtros locales
        if (key === '_id') {
          if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
            try {
              Object.assign(filterQuery, { [key]: new Types.ObjectId(stringValue) });
              console.log(`✅ _id convertido a ObjectId: ${stringValue}`);
            } catch {
              console.log(`❌ Error creando ObjectId para _id: ${stringValue}`);
            }
          } else {
            console.log(`⚠️ _id incompleto o inválido ignorado: "${stringValue}" (longitud: ${stringValue.length})`);
          }
        } else if (key.includes('Id')) {
          try {
            Object.assign(filterQuery, { [key]: new Types.ObjectId(stringValue) });
          } catch {
            Object.assign(filterQuery, { [key]: stringValue });
          }
        } else {
          // Para campos booleanos como "attended", convertir string a boolean
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

  // Manejar ordenamiento
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

  // Procesar filtros del array
  filtersArray.forEach((filter) => {
    const { field, operator = 'eq', value } = filter;

    if (!value && value !== 0 && value !== false) return;

    console.log(`📝 Procesando filtro: ${field} ${operator} "${value}" (tipo: ${typeof value})`);

    // Verificar si es un filtro para un campo populado
    const isPopulateFilter = populateFields.some(popField => field.startsWith(popField + '.'));
    
    if (isPopulateFilter) {
      // Almacenar filtros para campos populados
      if (!populateFilters[field]) {
        populateFilters[field] = {};
      }
      populateFilters[field] = { operator, value };
    } else {
      // Procesar filtros locales normalmente
      processLocalFilter(filterQuery, field, operator, value);
    }
  });

  // Función helper para procesar filtros locales
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
            console.log(`⚠️ _id incompleto o inválido ignorado en filtro local: "${stringValue}" (longitud: ${stringValue.length})`);
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
        } catch (error) {
          Object.assign(filterQuery, { [field]: { $regex: stringValue, $options: 'i' } });
        }
        break;

      case 'startswith':
        try {
          const regex = new RegExp(`^${stringValue}`, 'i');
          Object.assign(filterQuery, { [field]: { $regex: regex } });
        } catch (error) {
          Object.assign(filterQuery, { [field]: { $regex: `^${stringValue}`, $options: 'i' } });
        }
        break;

      case 'endswith':
        try {
          const regex = new RegExp(`${stringValue}$`, 'i');
          Object.assign(filterQuery, { [field]: { $regex: regex } });
        } catch (error) {
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

  // Función helper para crear pipeline de agregación con $lookup
  function createAggregationPipeline() {
    const pipeline: any[] = [];

    // Agregar $match inicial para filtros locales
    if (Object.keys(filterQuery).length > 0) {
      console.log('🎯 FilterQuery final:', JSON.stringify(filterQuery, null, 2));
      pipeline.push({ $match: filterQuery });
    }

    // Agregar $lookup para cada campo populado
    populateFields.forEach(field => {
      const schema = model.schema;
      const schemaPath = schema.path(field);
      
      if (schemaPath && schemaPath instanceof Schema.Types.ObjectId) {
        // Obtener el nombre de la colección referenciada
        const refModel = schemaPath.options.ref;
        if (refModel) {
          const refCollection = model.db.model(refModel).collection.name;
          
          pipeline.push({
            $lookup: {
              from: refCollection,
              localField: field,
              foreignField: '_id',
              as: field + '_temp' // Usar nombre temporal para el lookup
            }
          });

          // Unwind si es una referencia singular
          pipeline.push({
            $unwind: {
              path: `$${field}_temp`,
              preserveNullAndEmptyArrays: true
            }
          });

          // Reemplazar el campo original con los datos populados
          pipeline.push({
            $addFields: {
              [field]: `$${field}_temp`
            }
          });

          // Remover el campo temporal
          pipeline.push({
            $unset: `${field}_temp`
          });
        }
      }
    });

    // Agregar filtros para campos populados
    const populateMatchConditions: any = {};
    Object.keys(populateFilters).forEach(filterField => {
      const filterConfig = populateFilters[filterField];
      const { operator = 'eq', value } = typeof filterConfig === 'object' && filterConfig.operator 
        ? filterConfig 
        : { operator: 'eq', value: filterConfig };

      // Usar el nombre original del campo (ya no necesitamos convertir)
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

    // Agregar $match para filtros de campos populados
    if (Object.keys(populateMatchConditions).length > 0) {
      pipeline.push({ $match: populateMatchConditions });
      console.log('🔍 Filtros aplicados a campos populados:', populateMatchConditions);
    }

    // Agregar ordenamiento
    if (Object.keys(sortOptions).length > 0) {
      pipeline.push({ $sort: sortOptions });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    return pipeline;
  }

  let items: T[];
  let totalItems: number;

  // Usar agregación si hay campos populados o filtros en campos populados
  if (populateFields.length > 0 || Object.keys(populateFilters).length > 0) {
    console.log('🔗 Usando agregación con $lookup para campos populados');
    
    const pipeline = createAggregationPipeline();
    
    // Pipeline para contar total
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: "total" });
    
    // Pipeline para obtener items con paginación
    const itemsPipeline = [...pipeline];
    itemsPipeline.push({ $skip: skip });
    itemsPipeline.push({ $limit: limit });

    // Ejecutar ambos pipelines
    const [countResult, itemsResult] = await Promise.all([
      model.aggregate(countPipeline).exec(),
      model.aggregate(itemsPipeline).exec()
    ]);

    totalItems = countResult.length > 0 ? countResult[0].total : 0;
    items = itemsResult as T[];

    console.log('📊 Pipeline de agregación usado:', JSON.stringify(pipeline, null, 2));
  } else {
    // Usar método tradicional si no hay campos populados
    console.log('📋 Usando consulta tradicional sin $lookup');
    
    let query = model.find(filterQuery);

    // Aplicar ordenamiento
    if (Object.keys(sortOptions).length > 0) {
      query = query.sort(sortOptions);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    // Ejecutar consultas
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