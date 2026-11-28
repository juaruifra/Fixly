import { ChevronRightIcon } from "lucide-react";
import { Link } from "react-router-dom";

import CatalogImage from "@/components/common/CatalogImage";
import { formatCurrency } from "@/utils/formatCurrency";

/**
 * Representa la vista tabular del catálogo público de Shop.
 * No consulta datos ni gestiona paginación; solo transforma los servicios
 * recibidos en filas semánticas que conservan la navegación al detalle.
 *
 * @param {Object} props - Datos de presentación.
 * @param {Array<Object>} props.services - Servicios de la página actual.
 * @param {string} props.search - Query string actual para conservar filtros al volver.
 * @returns {import("react").JSX.Element} Tabla semántica de servicios.
 */
export default function ShopServiceTable({ services, search }) {
  return (
    <div className="shop-service-table-scroll">
      <table className="shop-service-table">
        <colgroup>
          <col className="shop-service-table-col-service" />
          <col className="shop-service-table-col-description" />
          <col className="shop-service-table-col-price" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="shop-service-table-service-column">Servicio</th>
            <th scope="col" className="shop-service-table-description-column">Descripción</th>
            <th scope="col" className="shop-service-table-price-column">Precio desde</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => {
            const detailTo = {
              pathname: `/shop/${encodeURIComponent(service.slug)}`,
              search,
            };

            return (
              <tr key={service.slug}>
                <td className="shop-service-table-service-column">
                  <div className="shop-service-table-service">
                    <div className="shop-service-table-thumbnail">
                      <CatalogImage image={service.image} />
                    </div>
                    <div className="shop-service-table-copy">
                      <Link className="shop-service-table-name" to={detailTo}>{service.name}</Link>
                      <span className="shop-service-table-category">{service.category.name}</span>
                    </div>
                  </div>
                </td>
                <td className="shop-service-table-description-column">
                  <p className="shop-service-table-description">{service.description || "—"}</p>
                </td>
                <td className="shop-service-table-price-column">
                  <Link className="shop-service-table-price-link" to={detailTo} aria-label={`Ver detalle de ${service.name}`}>
                    <strong>{formatCurrency(service.priceFrom)}</strong>
                    <ChevronRightIcon aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
