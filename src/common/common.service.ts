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
  const page = Number(paginationDto.current || paginationDto.page || 1);
  const limit = Number(paginationDto.pageSize || paginationDto.limit || 10);
  const skip = (page - 1) * limit;

  const filterQuery: FilterQuery<T> = {};

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

  // Combinar filtros de filters y params
  const allFilters = [
    ...(filtersArray || []),
    ...(paginationDto.params || [])
  ];

  console.log('🔍 Filtros combinados:', allFilters);

  allFilters.forEach((filter) => {
    const { field, operator = 'eq', value } = filter;

    if (!value && value !== 0 && value !== false) return;

    console.log(`📝 Procesando filtro: ${field} ${operator} "${value}" (tipo: ${typeof value})`);

    const stringValue = String(value);

    switch (operator) {
      case 'eq':
        if (field === '_id') {
          if (/^[0-9a-fA-F]{24}$/.test(stringValue)) {
            try {
              Object.assign(filterQuery, { [field]: new Types.ObjectId(stringValue) });
              console.log(`✅ ObjectId válido para _id: ${stringValue}`);
            } catch {
              console.log(`❌ Error creando ObjectId para _id: ${stringValue}`);
              return;
            }
          } else {
            console.log(`⚠️ _id incompleto o inválido ignorado: "${stringValue}"`);
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
  });

  console.log('🔍 Query MongoDB final:', JSON.stringify(filterQuery, null, 2));
  console.log('🔄 Opciones de ordenamiento:', JSON.stringify(sortOptions, null, 2));

  let query = model.find(filterQuery);

  if (populateFields.length > 0) {
    const populateOptions: PopulateOptions[] = populateFields.map(field => ({ path: field }));
    query = query.populate(populateOptions);
    console.log('🔗 Campos a popular:', populateFields);
  }

  if (Object.keys(sortOptions).length > 0) {
    query = query.sort(sortOptions);
    console.log('✅ Ordenamiento aplicado:', sortOptions);
  } else {
    query = query.sort({ createdAt: -1 });
    console.log('ℹ️ Usando ordenamiento por defecto: createdAt desc');
  }

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