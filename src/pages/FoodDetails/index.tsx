import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';
import { Image, AsyncStorage } from 'react-native';

import Icon from 'react-native-vector-icons/Feather';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import formatValue from '../../utils/formatValue';

import api from '../../services/api';

import {
  Container,
  Header,
  ScrollContainer,
  FoodsContainer,
  Food,
  FoodImageContainer,
  FoodContent,
  FoodTitle,
  FoodDescription,
  FoodPricing,
  AdditionalsContainer,
  Title,
  TotalContainer,
  AdittionalItem,
  AdittionalItemText,
  AdittionalQuantity,
  PriceButtonContainer,
  TotalPrice,
  QuantityContainer,
  FinishOrderButton,
  ButtonText,
  IconContainer,
} from './styles';

interface Params {
  id: number;
}

interface Extra {
  id: number;
  name: string;
  value: number;
  quantity: number;
}

interface Food {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: number;
  thumbnail_url: string;
  formattedPrice: string;
  extras: Extra[];
}

const FoodDetails: React.FC = () => {
  const [food, setFood] = useState({} as Food);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [foodQuantity, setFoodQuantity] = useState(1);

  const navigation = useNavigation();
  const route = useRoute();

  const routeParams = route.params as Params;

  useEffect(() => {
    async function loadFood(): Promise<void> {
      // Load a specific food with extras based on routeParams id
      const { data: selectedFood } = await api.get<Food>(
        `foods/${routeParams.id}`,
      );

      const formmatedExtras = selectedFood.extras.map(extra => ({
        ...extra,
        quantity: 0,
      }));

      const formattedFood = {
        ...selectedFood,
        formattedPrice: formatValue(selectedFood.price),
        extras: formmatedExtras,
      };

      setExtras(formattedFood.extras);
      setFood(formattedFood);
    }

    loadFood();
  }, [routeParams]);

  useEffect(() => {
    async function loadFavorite(): Promise<void> {
      const { data: allFavorites } = await api.get<Food[]>('favorites');

      if (allFavorites.length) {
        const favorite = allFavorites.filter(item => {
          return item.id === routeParams.id;
        });

        setIsFavorite(!!favorite.length);
      }
    }

    loadFavorite();
  }, [routeParams]);

  function handleIncrementExtra(id: number): void {
    // Increment extra quantity
    const incrementExtra = extras.map(extra => {
      if (extra.id === id) {
        const quantity = extra.quantity + 1;

        return {
          ...extra,
          quantity,
        };
      }

      return extra;
    });

    setExtras(incrementExtra);
  }

  function handleDecrementExtra(id: number): void {
    // Decrement extra quantity
    const decrementExtra = extras.map(extra => {
      if (extra.id === id && extra.quantity > 0) {
        const quantity = extra.quantity - 1;

        return {
          ...extra,
          quantity,
        };
      }

      return extra;
    });

    setExtras(decrementExtra);
  }

  function handleIncrementFood(): void {
    // Increment food quantity
    setFoodQuantity(old => old + 1);
  }

  function handleDecrementFood(): void {
    // Decrement food quantity
    if (foodQuantity > 1) setFoodQuantity(old => old - 1);
  }

  const toggleFavorite = useCallback(() => {

    if (isFavorite) {
      api.delete(`favorites/${food.id}`).then(response => setIsFavorite(false));

      return;
    }

    const {
      id,
      name,
      description,
      price,
      category,
      image_url,
      thumbnail_url,
    } = food;

    api.post('favorites', {
      id,
      name,
      description,
      price,
      category,
      image_url,
      thumbnail_url,
    })
    .then(response => setIsFavorite(true));
  }, [isFavorite, food]);

  const cartTotal = useMemo(() => {
    // Calculate cartTotal
    const foodPrices = food.price * foodQuantity;

    if (extras.length) {
      const extraPrices = extras
      .map(extra => {
        return extra.quantity * extra.value;
      })
      .reduce((acc, values) => {
        return acc + values;
      });

      const totalPrice = foodPrices + extraPrices;

      return formatValue(totalPrice);
    }

    return foodPrices;
  }, [extras, food, foodQuantity]);

  async function handleFinishOrder(): Promise<void> {
    // Finish the order and save on the API
    const {
      id: product_id,
      name,
      description,
      price,
      category,
      thumbnail_url,
    } = food;

    const priceWithoutSimbols = String(cartTotal)
    .replace('R$', '')
    .replace(',','.');

    const formmatedPrice = Number(priceWithoutSimbols);

    await api.post('orders', {
      product_id,
      name,
      description,
      price: formmatedPrice,
      category,
      thumbnail_url,
      extras,
    });

    navigation.navigate('Orders');
  }

  // Calculate the correct icon name
  const favoriteIconName = useMemo(
    () => (isFavorite ? 'favorite' : 'favorite-border'),
    [isFavorite],
  );

  useLayoutEffect(() => {
    // Add the favorite icon on the right of the header bar
    navigation.setOptions({
      headerRight: () => (
        <MaterialIcon
          name={favoriteIconName}
          size={24}
          color="#FFB84D"
          onPress={() => toggleFavorite()}
        />
      ),
    });
  }, [navigation, favoriteIconName, toggleFavorite]);

  return (
    <Container>
      <Header />

      <ScrollContainer>
        <FoodsContainer>
          <Food>
            <FoodImageContainer>
              <Image
                style={{ width: 327, height: 183 }}
                source={{
                  uri: food.image_url,
                }}
              />
            </FoodImageContainer>
            <FoodContent>
              <FoodTitle>{food.name}</FoodTitle>
              <FoodDescription>{food.description}</FoodDescription>
              <FoodPricing>{food.formattedPrice}</FoodPricing>
            </FoodContent>
          </Food>
        </FoodsContainer>
        <AdditionalsContainer>
          <Title>Adicionais</Title>
          {extras.map(extra => (
            <AdittionalItem key={extra.id}>
              <AdittionalItemText>{extra.name}</AdittionalItemText>
              <AdittionalQuantity>
                <Icon
                  size={15}
                  color="#6C6C80"
                  name="minus"
                  onPress={() => handleDecrementExtra(extra.id)}
                  testID={`decrement-extra-${extra.id}`}
                />
                <AdittionalItemText testID={`extra-quantity-${extra.id}`}>
                  {extra.quantity}
                </AdittionalItemText>
                <Icon
                  size={15}
                  color="#6C6C80"
                  name="plus"
                  onPress={() => handleIncrementExtra(extra.id)}
                  testID={`increment-extra-${extra.id}`}
                />
              </AdittionalQuantity>
            </AdittionalItem>
          ))}
        </AdditionalsContainer>
        <TotalContainer>
          <Title>Total do pedido</Title>
          <PriceButtonContainer>
            <TotalPrice testID="cart-total">{cartTotal}</TotalPrice>
            <QuantityContainer>
              <Icon
                size={15}
                color="#6C6C80"
                name="minus"
                onPress={handleDecrementFood}
                testID="decrement-food"
              />
              <AdittionalItemText testID="food-quantity">
                {foodQuantity}
              </AdittionalItemText>
              <Icon
                size={15}
                color="#6C6C80"
                name="plus"
                onPress={handleIncrementFood}
                testID="increment-food"
              />
            </QuantityContainer>
          </PriceButtonContainer>

          <FinishOrderButton onPress={() => handleFinishOrder()}>
            <ButtonText>Confirmar pedido</ButtonText>
            <IconContainer>
              <Icon name="check-square" size={24} color="#fff" />
            </IconContainer>
          </FinishOrderButton>
        </TotalContainer>
      </ScrollContainer>
    </Container>
  );
};

export default FoodDetails;
