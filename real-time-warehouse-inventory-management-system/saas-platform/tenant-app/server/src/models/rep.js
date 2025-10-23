module.exports = (sequelize, DataTypes) => {
  const Rep = sequelize.define('Rep', {
    rep_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rep_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [2, 20],
      },
    },
    rep_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        len: [0, 20],
      },
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hire_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    salary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    commission_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100,
      },
    },
    territory: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended'),
      defaultValue: 'active',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'user_id',
      },
    },
  }, {
    tableName: 'Reps',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['rep_code'],
      },
      {
        unique: true,
        fields: ['email'],
        where: {
          email: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      },
      {
        fields: ['status'],
      },
      {
        fields: ['territory'],
      },
    ],
  });

  Rep.associate = (models) => {
    // Rep belongs to creator (User)
    Rep.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
      onDelete: 'SET NULL',
    });

    // Rep has many sales invoices
    Rep.hasMany(models.SalesInvoice, {
      foreignKey: 'rep_id',
      as: 'salesInvoices',
    });

    // Rep has many loading transactions
    Rep.hasMany(models.LoadingTransaction, {
      foreignKey: 'rep_id',
      as: 'loadingTransactions',
    });

    // Rep has many unloading transactions
    Rep.hasMany(models.UnloadingTransaction, {
      foreignKey: 'rep_id',
      as: 'unloadingTransactions',
    });

    // Rep has many customers (territory management)
    Rep.hasMany(models.Customer, {
      foreignKey: 'rep_id',
      as: 'customers',
    });

    // Rep performance tracking
    Rep.hasMany(models.DailySales, {
      foreignKey: 'rep_id',
      as: 'dailySales',
    });
  };

  return Rep;
};
