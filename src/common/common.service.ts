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
      
      // Aplicar la misma lógica que el operador 'eq' en los filtros
      if (key === '_id') {
        // Validar ObjectId solo para _id
        if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
          try {
            Object.assign(filterQuery, { [key]: new Types.ObjectId(stringValue) });
            console.log(`✅ ObjectId válido para _id: ${stringValue}`);
          } catch {
            console.log(`❌ Error creando ObjectId para _id: ${stringValue}`);
          }
        } else {
          console.log(`⚠️ _id incompleto o inválido ignorado: "${stringValue}" (debe ser 24 caracteres hex)`);
        }
      } else if (key.includes('Id')) {
        // Otros campos que terminan en Id
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
    
    // Refinedev envía múltiples sorters, pero generalmente usamos el primero
    // Si necesitas múltiples, puedes mapearlos todos
    paginationDto.sorters.forEach((sorter) => {
      if (sorter.field) {
        const order = sorter.order?.toLowerCase() === 'desc' ? -1 : 1;
        sortOptions[sorter.field] = order;
        console.log(`🔄 Ordenando por: ${sorter.field} ${sorter.order}`);
      }
    });
  } else {
    // Fallback a los parámetros legacy _sort y _order
    if (paginationDto._sort && paginationDto._order) {
      const order = paginationDto._order.toLowerCase() === 'desc' ? -1 : 1;
      sortOptions[paginationDto._sort] = order;
      
    }
  }

  console.log('🔍 Filtros recibidos:', filtersArray);

  filtersArray.forEach((filter) => {
    const { field, operator = 'eq', value } = filter;

    if (!value && value !== 0 && value !== false) return;

    console.log(`📝 Procesando filtro: ${field} ${operator} "${value}" (tipo: ${typeof value})`);

    const stringValue = String(value);

    switch (operator) {
      case 'eq':
        if (field === '_id') {
          // Validar ObjectId solo para _id con operador eq
          if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
            try {
              Object.assign(filterQuery, { [field]: new Types.ObjectId(stringValue) });
              console.log(`✅ ObjectId válido para _id: ${stringValue}`);
            } catch {
              console.log(`❌ Error creando ObjectId para _id: ${stringValue}`);
              return; // Skip este filtro
            }
          } else {
            console.log(`⚠️ _id incompleto o inválido ignorado: "${stringValue}" (debe ser 24 caracteres hex)`);
            return; // Skip este filtro
          }
        } else if (field.includes('Id')) {
          // Otros campos que terminan en Id
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
          console.log(`✅ Regex creado para contains: /${stringValue}/i`);
        } catch (error) {
          console.error(`❌ Error creando regex:`, error);
          Object.assign(filterQuery, { [field]: { $regex: stringValue, $options: 'i' } });
        }
        break;

      case 'startswith':
        try {
          const regex = new RegExp(`^${stringValue}`, 'i');
          Object.assign(filterQuery, { [field]: { $regex: regex } });
          console.log(`✅ Regex creado para startswith: /^${stringValue}/i`);
        } catch (error) {
          console.error(`❌ Error creando regex:`, error);
          Object.assign(filterQuery, { [field]: { $regex: `^${stringValue}`, $options: 'i' } });
        }
        break;

      case 'endswith':
        try {
          const regex = new RegExp(`${stringValue}$`, 'i');
          Object.assign(filterQuery, { [field]: { $regex: regex } });
          console.log(`✅ Regex creado para endswith: /${stringValue}$/i`);
        } catch (error) {
          console.error(`❌ Error creando regex:`, error);
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
        // Fallback para operadores desconocidos
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
          } catch  {
            Object.assign(filterQuery, { [field]: { $regex: stringValue, $options: 'i' } });
          }
        } else {
          Object.assign(filterQuery, { [field]: value });
        }
        break;
    }
  });

  console.log('🔍 Query MongoDB final:', JSON.stringify(filterQuery, null, 2));
  console.log('🔄 Opciones de ordenamiento:', JSON.stringify(sortOptions, null, 2));

  // Configurar populate options
  let query = model.find(filterQuery);
  
  if (populateFields.length > 0) {
    const populateOptions: PopulateOptions[] = populateFields.map(field => ({ path: field }));
    query = query.populate(populateOptions);
    console.log('🔗 Campos a popular:', populateFields);
  }

  // Aplicar ordenamiento
  if (Object.keys(sortOptions).length > 0) {
    query = query.sort(sortOptions);
    console.log('✅ Ordenamiento aplicado:', sortOptions);
  } else {
    // Ordenamiento por defecto (opcional)
    query = query.sort({ createdAt: -1 }); // o el campo que prefieras
    console.log('ℹ️ Usando ordenamiento por defecto: createdAt desc');
  }

  // Ejecutar consultas
  const totalItems = await model.countDocuments(filterQuery).exec();
  const items = await query.skip(skip).limit(limit).exec();

  const totalPages = Math.ceil(totalItems / limit);

  console.log(`📊 Resultado: ${items.length} items de ${totalItems} total (página ${page}/${totalPages})`);

  return {
    items,
    totalItems,
    totalPages,
    currentPage: page,
  };
}