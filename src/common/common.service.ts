import { FilterQuery, Model, Types, PopulateOptions } from 'mongoose';
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
  
  // Separar filtros normales de filtros que requieren lookup
  const normalFilters: FilterDto[] = [];
  const lookupFilters: FilterDto[] = [];

  // NUEVO: Manejar campos adicionales como filtros directos con operador 'eq'
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
      
      if (key === '_id') {
        if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
          try {
            Object.assign(filterQuery, { [key]: new Types.ObjectId(stringValue) });
            console.log(`✅ ObjectId válido para _id: ${stringValue}`);
          } catch {
            console.log(`❌ Error creando ObjectId para _id: ${stringValue}`);
          }
        } else {
          console.log(`⚠️ _id incompleto o inválido ignorado: "${stringValue}"`);
        }
      } else if (key.includes('Id')) {
        try {
          Object.assign(filterQuery, { [key]: new Types.ObjectId(stringValue) });
          console.log(`✅ ObjectId aplicado para ${key}: ${stringValue}`);
        } catch {
          Object.assign(filterQuery, { [key]: stringValue });
          console.log(`✅ String aplicado para ${key}: ${stringValue}`);
        }
      } else {
        Object.assign(filterQuery, { [key]: value });
        console.log(`✅ Filtro directo aplicado: ${key} = ${value}`);
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

  // Categorizar filtros
  filtersArray.forEach((filter) => {
    if (filter.field.includes('.')) {
      lookupFilters.push(filter);
      console.log(`📋 Filtro de lookup detectado: ${filter.field}`);
    } else {
      normalFilters.push(filter);
      console.log(`📋 Filtro normal detectado: ${filter.field}`);
    }
  });

  // Procesar filtros normales
  normalFilters.forEach((filter) => {
    const { field, operator = 'eq', value } = filter;
  
    if (!value && value !== 0 && value !== false) return;
  
    console.log(`📝 Procesando filtro normal: ${field} ${operator} "${value}"`);
  
    const stringValue = String(value);
  
    const setNestedField = (obj: any, path: string, value: any) => {
      const parts = path.split('.');
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    };
  
    switch (operator) {
      case 'eq':
        if (field === '_id') {
          if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
            try {
              setNestedField(filterQuery, field, new Types.ObjectId(stringValue));
            } catch {
              console.log(`❌ Error creando ObjectId para _id: ${stringValue}`);
              return;
            }
          } else {
            console.log(`⚠️ _id inválido ignorado: "${stringValue}"`);
            return;
          }
        } else if (field.includes('Id')) {
          try {
            setNestedField(filterQuery, field, new Types.ObjectId(stringValue));
          } catch {
            setNestedField(filterQuery, field, stringValue);
          }
        } else {
          setNestedField(filterQuery, field, value);
        }
        break;
  
      case 'contains':
        try {
          const regex = new RegExp(stringValue, 'i');
          setNestedField(filterQuery, field, { $regex: regex });
        } catch {
          setNestedField(filterQuery, field, { $regex: stringValue, $options: 'i' });
        }
        break;

      case 'startswith':
        try {
          const regex = new RegExp(`^${stringValue}`, 'i');
          setNestedField(filterQuery, field, { $regex: regex });
        } catch {
          setNestedField(filterQuery, field, { $regex: `^${stringValue}`, $options: 'i' });
        }
        break;
  
      case 'endswith':
        try {
          const regex = new RegExp(`${stringValue}$`, 'i');
          setNestedField(filterQuery, field, { $regex: regex });
        } catch {
          setNestedField(filterQuery, field, { $regex: `${stringValue}$`, $options: 'i' });
        }
        break;
  
      case 'gt':
        setNestedField(filterQuery, field, { $gt: isNaN(Number(value)) ? value : Number(value) });
        break;
  
      case 'gte':
        setNestedField(filterQuery, field, { $gte: isNaN(Number(value)) ? value : Number(value) });
        break;
  
      case 'lt':
        setNestedField(filterQuery, field, { $lt: isNaN(Number(value)) ? value : Number(value) });
        break;
  
      case 'lte':
        setNestedField(filterQuery, field, { $lte: isNaN(Number(value)) ? value : Number(value) });
        break;
  
      case 'ne':
        setNestedField(filterQuery, field, { $ne: value });
        break;
  
      case 'in':
        const arrayValue = Array.isArray(value) ? value : [value];
        setNestedField(filterQuery, field, { $in: arrayValue });
        break;
  
      case 'nin':
        const notInArrayValue = Array.isArray(value) ? value : [value];
        setNestedField(filterQuery, field, { $nin: notInArrayValue });
        break;
  
      default:
        if (field.includes('Id')) {
          try {
            setNestedField(filterQuery, field, new Types.ObjectId(stringValue));
          } catch {
            setNestedField(filterQuery, field, stringValue);
          }
        } else if (typeof value === 'string') {
          try {
            const regex = new RegExp(stringValue, 'i');
            setNestedField(filterQuery, field, { $regex: regex });
          } catch {
            setNestedField(filterQuery, field, { $regex: stringValue, $options: 'i' });
          }
        } else {
          setNestedField(filterQuery, field, value);
        }
        break;
    }
  });

  console.log('🔍 Query MongoDB después de filtros normales:', JSON.stringify(filterQuery, null, 2));

  // ===== USAR AGGREGATION CON LOOKUP PARA FILTROS ANIDADOS =====
  if (lookupFilters.length > 0) {
    console.log(`🔗 Usando aggregation pipeline para ${lookupFilters.length} filtros con lookup...`);
    
    const aggregationPipeline: any[] = [];
    
    // 1. Match inicial con filtros normales
    if (Object.keys(filterQuery).length > 0) {
      aggregationPipeline.push({ $match: filterQuery });
    }

    // 2. Identificar campos de referencia únicos
    const referencedFields = new Set<string>();
    const lookupConfig: { [key: string]: string } = {};

    lookupFilters.forEach(filter => {
      const refField = filter.field.split('.')[0]; // 'eventId' de 'eventId.name'
      referencedFields.add(refField);
    });

    // 3. Configurar mapeo de campos a colecciones
    // IMPORTANTE: Ajusta estos nombres según tu esquema
    const getCollectionName = (refField: string): string => {
      switch (refField) {
        case 'eventId':
          return 'events'; // Nombre de tu colección de eventos
        case 'userId':
          return 'users';
        case 'categoryId':
          return 'categories';
        case 'organizerId':
          return 'organizers';
        // Agrega más casos según tu esquema
        default:
          // Fallback: remover 'Id' y pluralizar
          return refField.replace(/Id$/, '').toLowerCase() + 's';
      }
    };

    // 4. Agregar $lookup para cada campo de referencia
    referencedFields.forEach(refField => {
      const collectionName = getCollectionName(refField);
      lookupConfig[refField] = collectionName;
      
      aggregationPipeline.push({
        $lookup: {
          from: collectionName,
          localField: refField,
          foreignField: '_id',
          as: `${refField}_lookup`
        }
      });
      
      // Unwind para convertir array en objeto (preservar documentos sin referencia)
      aggregationPipeline.push({
        $unwind: {
          path: `$${refField}_lookup`,
          preserveNullAndEmptyArrays: true
        }
      });
      
      console.log(`🔗 Lookup configurado: ${refField} -> ${collectionName}`);
    });

    // 5. Aplicar filtros en campos lookup
    const lookupMatchConditions: any = {};
    
    lookupFilters.forEach(filter => {
      const { field, operator = 'eq', value } = filter;
      const [refField, ...subFieldParts] = field.split('.');
      const subField = subFieldParts.join('.'); // Permitir campos anidados profundos
      const lookupFieldPath = `${refField}_lookup.${subField}`;
      
      console.log(`🔍 Aplicando filtro lookup: ${lookupFieldPath} ${operator} "${value}"`);
      
      switch (operator) {
        case 'contains':
          lookupMatchConditions[lookupFieldPath] = { 
            $regex: new RegExp(String(value), 'i') 
          };
          break;
          
        case 'eq':
          if (subField.includes('Id') || subField === '_id') {
            // Tratar de convertir a ObjectId si es un ID
            try {
              if (/^[0-9a-fA-F]{24}$/.test(String(value))) {
                lookupMatchConditions[lookupFieldPath] = new Types.ObjectId(String(value));
              } else {
                lookupMatchConditions[lookupFieldPath] = value;
              }
            } catch {
              lookupMatchConditions[lookupFieldPath] = value;
            }
          } else {
            lookupMatchConditions[lookupFieldPath] = value;
          }
          break;
          
        case 'startswith':
          lookupMatchConditions[lookupFieldPath] = { 
            $regex: new RegExp(`^${String(value)}`, 'i') 
          };
          break;
          
        case 'endswith':
          lookupMatchConditions[lookupFieldPath] = { 
            $regex: new RegExp(`${String(value)}$`, 'i') 
          };
          break;
          
        case 'gt':
          lookupMatchConditions[lookupFieldPath] = { 
            $gt: isNaN(Number(value)) ? value : Number(value) 
          };
          break;
          
        case 'gte':
          lookupMatchConditions[lookupFieldPath] = { 
            $gte: isNaN(Number(value)) ? value : Number(value) 
          };
          break;
          
        case 'lt':
          lookupMatchConditions[lookupFieldPath] = { 
            $lt: isNaN(Number(value)) ? value : Number(value) 
          };
          break;
          
        case 'lte':
          lookupMatchConditions[lookupFieldPath] = { 
            $lte: isNaN(Number(value)) ? value : Number(value) 
          };
          break;
          
        case 'ne':
          lookupMatchConditions[lookupFieldPath] = { $ne: value };
          break;
          
        case 'in':
          const inArray = Array.isArray(value) ? value : [value];
          lookupMatchConditions[lookupFieldPath] = { $in: inArray };
          break;
          
        case 'nin':
          const ninArray = Array.isArray(value) ? value : [value];
          lookupMatchConditions[lookupFieldPath] = { $nin: ninArray };
          break;
          
        default:
          // Default a contains para strings
          if (typeof value === 'string') {
            lookupMatchConditions[lookupFieldPath] = { 
              $regex: new RegExp(String(value), 'i') 
            };
          } else {
            lookupMatchConditions[lookupFieldPath] = value;
          }
          break;
      }
    });

    // 6. Agregar match conditions si existen
    if (Object.keys(lookupMatchConditions).length > 0) {
      aggregationPipeline.push({ $match: lookupMatchConditions });
    }

    // 7. Limpiar campos temporales y restaurar estructura original
    const projectStage: any = {};
    
    // Incluir todos los campos originales
    const sampleDoc = await model.findOne().lean().exec();
    if (sampleDoc) {
      Object.keys(sampleDoc).forEach(key => {
        if (!key.endsWith('_lookup')) {
          projectStage[key] = 1;
        }
      });
    }
    
    // Mapear campos lookup de vuelta a su nombre original
    referencedFields.forEach(refField => {
      projectStage[refField] = `$${refField}_lookup`;
    });
    
    aggregationPipeline.push({ $project: projectStage });

    // 8. Aplicar ordenamiento
    if (Object.keys(sortOptions).length > 0) {
      aggregationPipeline.push({ $sort: sortOptions });
    } else {
      aggregationPipeline.push({ $sort: { createdAt: -1 } });
    }

    console.log('🔧 Pipeline de agregación completo:', JSON.stringify(aggregationPipeline, null, 2));

    // 9. Contar documentos totales
    const countPipeline = [...aggregationPipeline, { $count: "total" }];
    const countResult = await model.aggregate(countPipeline).exec();
    const totalItems = countResult[0]?.total || 0;

    // 10. Obtener items con paginación
    const itemsPipeline = [
      ...aggregationPipeline,
      { $skip: skip },
      { $limit: limit }
    ];

    const items = await model.aggregate(itemsPipeline).exec() as T[];
    const totalPages = Math.ceil(totalItems / limit);

    console.log(`📊 Resultado con lookup: ${items.length} items de ${totalItems} total (página ${page}/${totalPages})`);

    return {
      items,
      totalItems,
      totalPages,
      currentPage: page,
    };

  } else {
    // ===== SIN FILTROS LOOKUP - CONSULTA NORMAL =====
    console.log('📋 Sin filtros de lookup, usando consulta normal con populate');
    
    let query = model.find(filterQuery);
    
    // Aplicar populate si se especifica
    if (populateFields.length > 0) {
      const populateOptions: PopulateOptions[] = populateFields.map(field => ({ path: field }));
      query = query.populate(populateOptions);
      console.log('🔗 Campos a popular:', populateFields);
    }

    // Aplicar ordenamiento
    if (Object.keys(sortOptions).length > 0) {
      query = query.sort(sortOptions);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    // Ejecutar consultas
    const totalItems = await model.countDocuments(filterQuery).exec();
    const items = await query.skip(skip).limit(limit).exec();
    const totalPages = Math.ceil(totalItems / limit);

    console.log(`📊 Resultado normal: ${items.length} items de ${totalItems} total (página ${page}/${totalPages})`);

    return {
      items,
      totalItems,
      totalPages,
      currentPage: page,
    };
  }
}